// Genera data/lore-corpus.json para el chat API (Vercel).
// Lee MDX de CrSaSo, limpia JSX y exporta texto + metadatos.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const contentDir = path.join(root, 'docs', 'CrSaSo');
const outDir = path.join(root, 'data');
const outFile = path.join(outDir, 'lore-corpus.json');
const booksJsonPath = path.join(root, 'src', 'data', 'crSaSoBooks.json');
const booksConfig = JSON.parse(fs.readFileSync(booksJsonPath, 'utf8'));

const EXCERPT_MAX = 400;
const TEXT_MAX = 12_000;

/** @type {string[]} */
const LORE_FOLDERS = [
  'personajes',
  'lugares',
  'eventos',
  'familias',
  'libros',
  'objetos-conceptos',
];

/** @type {Map<string, string>} */
const bookLabelByKey = new Map(booksConfig.books.map((b) => [b.key, b.label]));

function posix(p) {
  return p.split(path.sep).join('/');
}

/**
 * @param {string} docId e.g. personajes/Anya Rudzki
 */
function buildPermalink(docId) {
  const encoded = docId
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `/CrSaSo/${encoded}`;
}

/**
 * @param {unknown} raw
 */
function libroLabel(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const key = raw.trim();
  return bookLabelByKey.get(key) ?? key;
}

/**
 * @param {string} content
 */
function cleanMdxContent(content) {
  let text = content
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (t.startsWith('import ')) return false;
      return true;
    })
    .join('\n');

  text = text.replace(/<BrowserOnly[\s\S]*?<\/BrowserOnly>/g, ' ');
  text = text.replace(/<Infobox[\s\S]*?\/>/g, ' ');
  text = text.replace(/<Infobox[\s\S]*?<\/Infobox>/g, ' ');
  text = text.replace(/<Link[^>]*>([\s\S]*?)<\/Link>/g, (_, inner) =>
    inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
  );
  text = text.replace(/<[A-Z][A-Za-z0-9]*[\s\S]*?\/>/g, ' ');
  text = text.replace(/<[A-Z][A-Za-z0-9]*[\s\S]*?<\/[A-Z][A-Za-z0-9]*>/g, ' ');
  text = text.replace(/<[a-z][^>]*>[\s\S]*?<\/[a-z]+>/g, ' ');
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/<[^>]+>/g, ' ');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  text = text.replace(/\*([^*]+)\*/g, '$1');
  text = text.replace(/_{1,2}([^_]+)_{1,2}/g, '$1');
  text = text.replace(/^#{1,6}\s+/gm, '');
  text = text.replace(/`/g, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  if (text.length > TEXT_MAX) {
    text = `${text.slice(0, TEXT_MAX)}…`;
  }
  return text;
}

/**
 * @param {string} folder
 */
function categoryFromFolder(folder) {
  const map = {
    personajes: 'personaje',
    lugares: 'lugar',
    eventos: 'evento',
    familias: 'familia',
    libros: 'libro',
    'objetos-conceptos': 'objeto',
  };
  return map[folder] ?? folder;
}

/** @type {Array<{id: string; title: string; category: string; libro?: string; permalink: string; text: string; excerpt: string}>} */
const entries = [];

for (const folder of LORE_FOLDERS) {
  const absFolder = path.join(contentDir, folder);
  if (!fs.existsSync(absFolder)) {
    console.warn(`[build-lore-corpus] omitido (no existe): ${folder}`);
    continue;
  }

  const files = await fg('**/*.{mdx,md}', {cwd: absFolder, absolute: true});
  for (const abs of files) {
    const relWithinFolder = posix(path.relative(absFolder, abs));
    const docId = `${folder}/${relWithinFolder.replace(/\.(mdx|md)$/i, '')}`;
    const raw = fs.readFileSync(abs, 'utf8');
    const {data, content} = matter(raw);

    const title =
      typeof data.title === 'string' && data.title.trim()
        ? data.title.trim()
        : path.basename(abs, path.extname(abs));

    const text = cleanMdxContent(content);
    if (!text || text.length < 40) continue;

    const excerpt = text.slice(0, EXCERPT_MAX);
    const typeField = typeof data.type === 'string' ? data.type.trim() : categoryFromFolder(folder);
    const libroRaw = typeof data.libro === 'string' ? data.libro : undefined;

    entries.push({
      id: docId,
      title,
      category: typeField,
      libro: libroLabel(libroRaw),
      permalink: buildPermalink(docId),
      text,
      excerpt,
    });
  }
}

fs.mkdirSync(outDir, {recursive: true});
const payload = {
  generatedAt: new Date().toISOString(),
  universe: 'cronicas',
  entries,
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.log(
  `[build-lore-corpus] ${entries.length} entradas → ${posix(path.relative(root, outFile))}`,
);
