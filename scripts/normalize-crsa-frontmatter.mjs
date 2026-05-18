/**
 * Normaliza frontmatter en docs/CrSaSo.
 * Esquema: title, description, updated, type, saga, libro, genero, estado, raza
 * (genero/estado/raza solo en personajes/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const CRSASO_DIR = path.join(root, 'docs', 'CrSaSo');

const DEFAULT_LIBRO = 'necromancia-medianoche';
const DEFAULT_SAGA = 'crsaso';
const TODAY = new Date().toISOString().slice(0, 10);

const SKIP_BASENAMES = new Set([
  'personajes.mdx',
  'eventos.mdx',
  'familia.mdx',
  'lugares.mdx',
  'objetos-conceptos.mdx',
  'index_c.mdx',
]);

const SKIP_IDS = new Set([
  'personajes-portada',
  'eventos-portada',
  'familia-portada',
  'lugares-portada',
  'objetos-conceptos-portada',
  'index',
  'index_c',
  'libros/index',
  'libros/index-libros',
]);

const TYPE_BY_FOLDER = {
  personajes: 'personaje',
  eventos: 'evento',
  lugares: 'lugar',
  familias: 'familia',
  'objetos-conceptos': 'objeto-concepto',
  libros: 'libro',
};

const LIBRO_BY_BASENAME = {
  'La Mujer Carmesí.mdx': 'mujer-carmesi',
  'Necromancia a Medianoche.mdx': 'necromancia-medianoche',
};

function inferType(relPath) {
  const folder = relPath.split('/')[0];
  return TYPE_BY_FOLDER[folder] ?? folder;
}

function inferLibro(relPath, data) {
  if (data.libro && String(data.libro).trim()) return String(data.libro).trim();
  if (data.cards_filters?.libro) return String(data.cards_filters.libro).trim();
  const base = path.basename(relPath);
  if (LIBRO_BY_BASENAME[base]) return LIBRO_BY_BASENAME[base];
  if (relPath.startsWith('libros/')) {
    const name = base.replace(/\.mdx?$/i, '');
    if (name === 'La Mujer Carmesí') return 'mujer-carmesi';
    if (name === 'Necromancia a Medianoche') return 'necromancia-medianoche';
  }
  return DEFAULT_LIBRO;
}

function inferSaga(data) {
  if (data.saga && String(data.saga).trim()) return String(data.saga).trim();
  return DEFAULT_SAGA;
}

function extractQuotedInfoboxValue(content, labelVariants) {
  for (const label of labelVariants) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `\\{\\s*label:\\s*['"]${escaped}['"]\\s*,\\s*value:\\s*['"]([^'"]+)['"]`,
      'i',
    );
    const m = content.match(re);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return undefined;
}

function extractPersonajeFields(content) {
  const genero =
    extractQuotedInfoboxValue(content, ['Género', 'Genero']) || undefined;
  const estado =
    extractQuotedInfoboxValue(content, ['Estado Actual', 'Estado']) || undefined;
  const raza =
    extractQuotedInfoboxValue(content, ['Especie', 'Raza']) || undefined;
  return { genero, estado, raza };
}

function inferPersonajeDefaults(content, title, partial) {
  const out = { ...partial };
  const plain = content.replace(/<[^>]+>/g, ' ').toLowerCase();
  const captionMatch = content.match(/caption\s*=\s*["']([^"']+)["']/i);
  const infoboxBlock = (content.match(/<Infobox[\s\S]*?\n\s*\/>/) ?? [''])[0];
  const speciesScope = `${infoboxBlock}\n${captionMatch?.[1] ?? ''}\n${title}`.toLowerCase();

  if (!out.genero) {
    if (/\bmujer\b/.test(plain) || /\bfemenin/.test(plain)) out.genero = 'Femenino';
    else if (/\bhombre\b/.test(plain) || /\bmasculin/.test(plain)) out.genero = 'Masculino';
  }

  if (!out.estado) {
    if (/\bfallecid/.test(plain) || /\(†\)/.test(content)) out.estado = 'Fallecido';
    else if (/\bdesaparecid/.test(plain)) out.estado = 'Desaparecido';
    else if (/\bactiv[oa]\b/.test(plain) || /\bsobreviv/.test(plain)) out.estado = 'Activo';
  }

  if (!out.raza) {
    if (/rapax\s+hominum/.test(speciesScope)) out.raza = 'Rapax Hominum';
    else if (/\bvampir/.test(speciesScope)) out.raza = 'Vampiro';
    else out.raza = 'Humano';
  }

  return out;
}

function yamlString(v) {
  if (v === undefined || v === null || String(v).trim() === '') return null;
  const s = String(v).trim();
  if (/[:#{}[\],&*?|>!%@`"'\n]/.test(s) || s.startsWith(' ') || s.endsWith(' ')) {
    return JSON.stringify(s);
  }
  return s;
}

function buildFrontmatterBlock(fields) {
  const lines = ['---'];
  for (const [key, val] of fields) {
    if (val === null || val === undefined) continue;
    const y = yamlString(val);
    if (y === null) continue;
    lines.push(`${key}: ${y}`);
  }
  lines.push('---');
  return lines.join('\n');
}

const MANAGED_KEYS = new Set([
  'title',
  'description',
  'updated',
  'date',
  'type',
  'saga',
  'libro',
  'genero',
  'estado',
  'raza',
  'cards_filters',
]);

function normalizeFile(absPath) {
  const rel = path.relative(CRSASO_DIR, absPath).replace(/\\/g, '/');
  const base = path.basename(absPath);
  if (SKIP_BASENAMES.has(base)) return { skipped: true };

  const raw = fs.readFileSync(absPath, 'utf8');
  const { data, content } = matter(raw);
  if (data.id && SKIP_IDS.has(String(data.id))) return { skipped: true };

  const isPersonaje = rel.startsWith('personajes/');
  const title =
    (typeof data.title === 'string' && data.title.trim()) ||
    path.basename(absPath, path.extname(absPath));

  let description = typeof data.description === 'string' ? data.description.trim() : '';
  if (!description && isPersonaje) {
    description = `Ficha de ${title} en Crónicas de Sangre y Sombra.`;
  }

  const updated =
    (typeof data.updated === 'string' && data.updated.trim()) ||
    (typeof data.date === 'string' && data.date.trim()) ||
    TODAY;

  const type =
    (typeof data.type === 'string' && data.type.trim()) || inferType(rel);
  const saga = inferSaga(data);
  const libro = inferLibro(rel, data);

  /** @type {[string, string][]} */
  const fields = [
    ['title', title],
    ['description', description],
    ['updated', updated],
    ['type', type],
    ['saga', saga],
    ['libro', libro],
  ];

  if (isPersonaje) {
    let { genero, estado, raza } = extractPersonajeFields(raw);
    ({ genero, estado, raza } = inferPersonajeDefaults(raw, title, { genero, estado, raza }));
    fields.push(['genero', genero], ['estado', estado], ['raza', raza]);
  }

  const preserved = { ...data };
  for (const k of MANAGED_KEYS) delete preserved[k];

  const extraLines = [];
  for (const [k, v] of Object.entries(preserved)) {
    if (v === undefined) continue;
    if (typeof v === 'string') extraLines.push(`${k}: ${yamlString(v)}`);
    else if (typeof v === 'number' || typeof v === 'boolean') extraLines.push(`${k}: ${v}`);
  }

  let fm = buildFrontmatterBlock(fields);
  if (extraLines.length) {
    fm = fm.replace(/\n---$/, `\n${extraLines.join('\n')}\n---`);
  }

  const body = content.replace(/^\n+/, '');
  fs.writeFileSync(absPath, `${fm}\n\n${body}`.replace(/\n{3,}/g, '\n\n'), 'utf8');
  return { rel, isPersonaje };
}

if (!fs.existsSync(CRSASO_DIR)) {
  console.error('[normalize-crsa-frontmatter] No existe docs/CrSaSo');
  process.exit(1);
}

const files = await fg('**/*.{mdx,md}', { cwd: CRSASO_DIR, absolute: true });
let count = 0;
let personajes = 0;

for (const abs of files) {
  const r = normalizeFile(abs);
  if (r.skipped) continue;
  count++;
  if (r.isPersonaje) personajes++;
}

console.log(`[normalize-crsa-frontmatter] ${count} fichas CrSaSo (${personajes} personajes)`);
