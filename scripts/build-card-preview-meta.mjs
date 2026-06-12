// Genera static/card-preview-meta.json: vista previa (excerpt, imagen, fechas) + filters para CardsFromFolder.
//
// Imagen: frontmatter `image` (prioridad) o src del Infobox en el MDX.
// Fechas: `updated` y opcional `created` (YYYY-MM-DD) para tarjetas y artículos recientes.
//
// Filtros: bloque YAML opcional `cards_filters` (objeto clave → string o lista de strings).
// Claves legacy top-level (p. ej. `libro:`) se fusionan si no chocan con cards_filters.
// Ver docs: personajes.mdx filterDimensions debe usar las mismas keys en snake_case.
import fs from 'node:fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const outDir = path.join(root, 'static');
const outFile = path.join(outDir, 'card-preview-meta.json');
const booksJsonPath = path.join(root, 'src', 'data', 'crSaSoBooks.json');
const booksConfig = JSON.parse(fs.readFileSync(booksJsonPath, 'utf8'));

const EXCERPT_MAX = 400;

/** Claves top-level del frontmatter que se copian a filters (si no están en cards_filters). */
const LEGACY_FILTER_KEYS = ['libro', 'genero', 'estado', 'raza', 'type', 'saga'];

/** @type {{ id: string; contentDir: string }[]} */
const PLUGINS = [
  { id: 'orbe', contentDir: 'docs/orbe' },
  { id: 'cronicas', contentDir: 'docs/CrSaSo' },
  { id: 'meridian', contentDir: 'docs/meridian' },
  { id: 'tumulo', contentDir: 'docs/tumulo' },
];

function posix(p) {
  return p.split(path.sep).join('/');
}

/**
 * @param {string} k
 */
function sanitizeFilterKey(k) {
  if (typeof k !== 'string' || !k.trim()) return null;
  const s = k.trim();
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(s)) return null;
  return s;
}

/**
 * @param {unknown} v
 * @returns {string | string[] | undefined}
 */
function normalizeFilterValue(v) {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (Array.isArray(v)) {
    const arr = v.map((x) => String(x).trim()).filter(Boolean);
    if (arr.length === 0) return undefined;
    if (arr.length === 1) return arr[0];
    return arr;
  }
  return undefined;
}

function compareNormLabel(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Alinea variantes de clave/título de libro con crSaSoBooks.json. */
function normalizeBookFilterValue(raw) {
  const books = booksConfig.books;
  const byKey = new Map(books.map((b) => [b.key, b.key]));
  const labelToKey = new Map(books.map((b) => [compareNormLabel(b.label), b.key]));
  const t = String(raw).trim();
  if (!t) return t;
  if (byKey.has(t)) return t;
  const sl = t.toLowerCase().replace(/\s+/g, '-');
  if (byKey.has(sl)) return sl;
  const fromLabel = labelToKey.get(compareNormLabel(t));
  if (fromLabel) return fromLabel;
  if (sl === 'necromancia-a-medianoche') return 'necromancia-medianoche';
  return t;
}

const BOOK_FILTER_KEYS = new Set(['libro', 'aparicion']);

/**
 * @param {Record<string, string | string[]>} out
 */
function normalizeBookKeysInFilters(out) {
  for (const fk of BOOK_FILTER_KEYS) {
    if (out[fk] === undefined) continue;
    const v = out[fk];
    if (typeof v === 'string') out[fk] = normalizeBookFilterValue(v);
    else if (Array.isArray(v)) out[fk] = v.map((x) => normalizeBookFilterValue(String(x)));
  }
}

/**
 * @param {Record<string, unknown>} data
 * @returns {Record<string, string | string[]>}
 */
function extractFilters(data) {
  /** @type {Record<string, string | string[]>} */
  const out = {};

  const cf = data.cards_filters;
  if (cf && typeof cf === 'object' && !Array.isArray(cf)) {
    for (const [k, v] of Object.entries(cf)) {
      const key = sanitizeFilterKey(k);
      if (!key) continue;
      const nv = normalizeFilterValue(v);
      if (nv !== undefined) out[key] = nv;
    }
  }

  for (const legacy of LEGACY_FILTER_KEYS) {
    if (out[legacy] !== undefined) continue;
    const v = data[legacy];
    const nv = normalizeFilterValue(v);
    if (nv !== undefined) out[legacy] = nv;
  }

  normalizeBookKeysInFilters(out);

  if (out.libro && out.aparicion === undefined) {
    out.aparicion = out.libro;
  }

  return out;
}

/**
 * Primer párrafo de prosa (sin depender solo de description), tope EXCERPT_MAX.
 * @param {string} content
 */
function buildBodyExcerpt(content) {
  let body = content
    .split(/\n/)
    .filter((line) => {
      const t = line.trim();
      if (!t) return false;
      if (t.startsWith('import ')) return false;
      if (t.startsWith('{/*') || t.startsWith('//')) return false;
      return true;
    })
    .join('\n');
  body = body.replace(/^#{1,6}\s+[^\n]+\n+/m, '');
  const para = body.split(/\n\n+/).find((p) => {
    const s = p.trim();
    return s.length > 0 && !s.startsWith('<') && !s.startsWith('#');
  });
  if (!para) return '';
  const plain = para
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.slice(0, EXCERPT_MAX);
}

/**
 * @param {string} raw
 * @returns {{ image?: string; imageAlt?: string }}
 */
function extractInfoboxImage(raw) {
  const imagesArray = raw.match(/images=\{\[\s*\{[^}]*src:\s*['"]([^'"]+)['"][^}]*(?:alt:\s*['"]([^'"]*)['"])?/s);
  if (imagesArray) {
    return { image: imagesArray[1], imageAlt: imagesArray[2] || '' };
  }
  const imageProp =
    raw.match(/image=\{\{\s*src:\s*['"]([^'"]+)['"][^}]*(?:alt:\s*['"]([^'"]*)['"])?/s) ||
    raw.match(/image=\{\s*src:\s*['"]([^'"]+)['"][^}]*(?:alt:\s*['"]([^'"]*)['"])?/s);
  if (imageProp) {
    return { image: imageProp[1], imageAlt: imageProp[2] || '' };
  }
  return {};
}

/**
 * @param {unknown} v
 * @returns {string | undefined}
 */
function parseDateField(v) {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return v.toISOString().slice(0, 10);
  }
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim())) {
    return v.trim().slice(0, 10);
  }
  return undefined;
}

/**
 * @param {Record<string, unknown>} data
 * @returns {{ updated?: string; created?: string }}
 */
function extractDates(data) {
  /** @type {{ updated?: string; created?: string }} */
  const out = {};
  const updated = parseDateField(data.updated);
  const created = parseDateField(data.created);
  if (updated) out.updated = updated;
  if (created) out.created = created;
  return out;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} content
 * @param {string} raw
 * @param {string} titleFallback
 * @returns {{ excerpt?: string; image?: string; imageAlt?: string } | null}
 */
function buildPreviewPart(data, content, raw, titleFallback) {
  let excerpt = '';
  const previewExcerpt = data.preview_excerpt;
  if (typeof previewExcerpt === 'string' && previewExcerpt.trim()) {
    excerpt = previewExcerpt.trim().slice(0, EXCERPT_MAX);
  } else {
    const body = buildBodyExcerpt(content);
    if (body) excerpt = body;
    else if (typeof data.description === 'string' && data.description.trim()) {
      excerpt = data.description.trim().slice(0, EXCERPT_MAX);
    }
  }

  let image;
  let imageAlt = '';
  if (typeof data.image === 'string' && data.image.trim()) {
    image = data.image.trim();
    imageAlt = typeof data.image_alt === 'string' && data.image_alt.trim() ? data.image_alt.trim() : titleFallback;
  } else if (typeof data.youtube_id === 'string' && data.youtube_id.trim()) {
    const vid = data.youtube_id.trim();
    if (/^[\w-]{11}$/.test(vid)) {
      image = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
      imageAlt = titleFallback;
    }
  } else {
    const inf = extractInfoboxImage(raw);
    if (inf.image) {
      image = inf.image;
      imageAlt = inf.imageAlt || titleFallback;
    }
  }

  if (!excerpt && !image) return null;

  /** @type {{ excerpt: string; image?: string; imageAlt?: string }} */
  const out = { excerpt };
  if (image) {
    out.image = image;
    out.imageAlt = imageAlt || titleFallback;
  }
  return out;
}

/**
 * @param {Record<string, unknown>} data
 * @param {string} content
 * @param {string} raw
 * @param {string} titleFallback
 */
function buildDocEntry(data, content, raw, titleFallback) {
  const filters = extractFilters(data);
  const preview = buildPreviewPart(data, content, raw, titleFallback);
  const dates = extractDates(data);

  if (!preview && Object.keys(filters).length === 0 && !dates.updated && !dates.created) {
    return null;
  }

  /** @type {Record<string, unknown>} */
  const entry = {};
  if (preview) {
    entry.excerpt = preview.excerpt;
    if (preview.image) {
      entry.image = preview.image;
      entry.imageAlt = preview.imageAlt;
    }
  }
  if (Object.keys(filters).length) entry.filters = filters;
  if (dates.updated) entry.updated = dates.updated;
  if (dates.created) entry.created = dates.created;
  return entry;
}

/** @type {Record<string, Record<string, Record<string, unknown>>>} */
const byPlugin = {};

for (const { id: pluginId, contentDir } of PLUGINS) {
  const absDir = path.join(root, contentDir);
  if (!fs.existsSync(absDir)) {
    console.warn(`[build-card-preview-meta] omitido (no existe): ${contentDir}`);
    continue;
  }
  const files = await fg('**/*.{mdx,md}', { cwd: absDir, absolute: true });
  /** @type {Record<string, Record<string, unknown>>} */
  const map = {};
  for (const abs of files) {
    const rel = posix(path.relative(absDir, abs));
    const docId = rel.replace(/\.(mdx|md)$/i, '');
    const raw = fs.readFileSync(abs, 'utf8');
    const { data, content } = matter(raw);
    const title =
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : path.basename(abs, path.extname(abs));
    const entry = buildDocEntry(data, content, raw, title);
    if (entry) map[docId] = entry;
  }
  byPlugin[pluginId] = map;
}

fs.mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  ...byPlugin,
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
const total = Object.values(byPlugin).reduce((n, m) => n + Object.keys(m).length, 0);
console.log(
  `[build-card-preview-meta] ${total} entradas en ${Object.keys(byPlugin).length} plugins → ${posix(path.relative(root, outFile))}`,
);
