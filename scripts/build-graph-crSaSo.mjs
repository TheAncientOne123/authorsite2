// Genera static/graphs/crSaSo.json desde docs/CrSaSo (archivos .mdx y .md).
// Detecta enlaces: <Link to="...">, href=".../CrSaSo/...", markdown ](.../CrSaSo/...)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import matter from 'gray-matter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const crSaSoDir = path.join(root, 'docs', 'CrSaSo');
const outDir = path.join(root, 'static', 'graphs');
const outFile = path.join(outDir, 'crSaSo.json');
const booksJsonPath = path.join(root, 'src', 'data', 'crSaSoBooks.json');

/** Portadas de sidebar / índices: no son fichas del grafo (id = ruta relativa sin extensión). */
const EXCLUDED_GRAPH_NODE_IDS = new Set([
  'index_c',
  'eventos',
  'familia',
  'lugares',
  'personajes',
  'otros',
  'libros/index',
]);

function posix(p) {
  return p.split(path.sep).join('/');
}

const booksConfig = JSON.parse(fs.readFileSync(booksJsonPath, 'utf8'));
const BOOK_KEYS = new Set(booksConfig.books.map((b) => b.key));

/**
 * @param {Record<string, unknown>} data
 * @param {string} content
 */
function buildExcerpt(data, content) {
  const desc = data.description;
  if (typeof desc === 'string' && desc.trim()) {
    return desc.trim().slice(0, 600);
  }
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
  return plain.slice(0, 600);
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

const files = await fg('**/*.{mdx,md}', { cwd: crSaSoDir, absolute: true });
const idToMeta = new Map();

for (const abs of files) {
  const rel = posix(path.relative(crSaSoDir, abs));
  const id = rel.replace(/\.(mdx|md)$/i, '');
  const raw = fs.readFileSync(abs, 'utf8');
  const { data, content } = matter(raw);
  const title =
    typeof data.title === 'string' && data.title.trim()
      ? data.title.trim()
      : path.basename(abs, path.extname(abs));
  const category = id.includes('/') ? id.split('/')[0] : 'raíz';
  let libro = data.libro ?? null;
  if (libro && !BOOK_KEYS.has(String(libro))) {
    console.warn(`[build-graph-crSaSo] libro desconocido "${libro}" en ${rel} — se ignora`);
    libro = null;
  } else if (libro) {
    libro = String(libro);
  }

  const excerpt = buildExcerpt(data, content);
  const { image, imageAlt } = extractInfoboxImage(raw);

  idToMeta.set(id, {
    id,
    title,
    category,
    libro,
    path: rel,
    excerpt,
    ...(image ? { image, imageAlt: imageAlt || title } : {}),
  });
}

/** @param {string} tail ruta tras /CrSaSo/ */
function resolveTarget(tail) {
  let p = tail.replace(/^\/+/, '').replace(/\/+$/, '').replace(/#.*$/, '');
  try {
    p = decodeURIComponent(p);
  } catch {
    /* keep p */
  }
  if (!p) return null;
  if (idToMeta.has(p)) return p;
  const lower = p.toLowerCase();
  for (const nid of idToMeta.keys()) {
    if (nid.toLowerCase() === lower) return nid;
  }
  return null;
}

/**
 * @param {string} body
 * @returns {string[]}
 */
function extractCrSaSoTails(body) {
  const tails = new Set();
  const patterns = [
    /<Link[^>]*\s+to=\{"([^"]+)"\}/gi,
    /<Link[^>]*\s+to=\{'([^']+)'\}/gi,
    /<Link[^>]*\s+to="([^"]+)"/gi,
    /<Link[^>]*\s+to='([^']+)'/gi,
    /\s+href="([^"]*\/CrSaSo\/[^"]+)"/gi,
    /\s+href='([^']*\/CrSaSo\/[^']+)'/gi,
    /\]\(([^)]*\/CrSaSo\/[^)]+)\)/gi,
  ];
  for (const re of patterns) {
    let m;
    re.lastIndex = 0;
    while ((m = re.exec(body))) {
      const href = (m[1] || '').trim();
      const idx = href.indexOf('/CrSaSo/');
      if (idx === -1) continue;
      let tail = href.slice(idx + '/CrSaSo/'.length).replace(/#.*$/, '').replace(/\/$/, '');
      if (tail) tails.add(tail);
    }
  }
  return [...tails];
}

const edgeKey = (a, b) => (a < b ? `${a}\0${b}` : `${b}\0${a}`);
const edgePairs = new Set();

for (const abs of files) {
  const rel = posix(path.relative(crSaSoDir, abs));
  const sourceId = rel.replace(/\.(mdx|md)$/i, '');
  const raw = fs.readFileSync(abs, 'utf8');
  const { content } = matter(raw);
  for (const tail of extractCrSaSoTails(content)) {
    const targetId = resolveTarget(tail);
    if (!targetId || targetId === sourceId) continue;
    edgePairs.add(edgeKey(sourceId, targetId));
  }
}

let edges = [...edgePairs].map((k) => {
  const [a, b] = k.split('\0');
  return { source: a, target: b };
});

const validIds = new Set(idToMeta.keys());
const badEdges = edges.filter((e) => !validIds.has(e.source) || !validIds.has(e.target));
for (const e of badEdges) {
  console.warn(
    `[build-graph-crSaSo] arista omitida (nodo inexistente): ${e.source} — ${e.target}`,
  );
}
edges = edges.filter((e) => validIds.has(e.source) && validIds.has(e.target));

edges = edges.filter(
  (e) =>
    !EXCLUDED_GRAPH_NODE_IDS.has(e.source) &&
    !EXCLUDED_GRAPH_NODE_IDS.has(e.target),
);

const graphNodeIds = new Set(
  [...idToMeta.keys()].filter((id) => !EXCLUDED_GRAPH_NODE_IDS.has(id)),
);

const degree = new Map();
for (const id of graphNodeIds) degree.set(id, 0);
for (const { source, target } of edges) {
  if (graphNodeIds.has(source)) degree.set(source, (degree.get(source) || 0) + 1);
  if (graphNodeIds.has(target)) degree.set(target, (degree.get(target) || 0) + 1);
}

const nodes = [];
const nodeIdSeen = new Set();
for (const meta of idToMeta.values()) {
  if (EXCLUDED_GRAPH_NODE_IDS.has(meta.id)) continue;
  if (nodeIdSeen.has(meta.id)) {
    console.warn(`[build-graph-crSaSo] nodo duplicado omitido: ${meta.id}`);
    continue;
  }
  nodeIdSeen.add(meta.id);
  const node = {
    id: meta.id,
    label: meta.title,
    category: meta.category,
    libro: meta.libro,
    degree: degree.get(meta.id) || 0,
  };
  if (meta.excerpt) node.excerpt = meta.excerpt;
  if (meta.image) {
    node.image = meta.image;
    node.imageAlt = meta.imageAlt || meta.title;
  }
  nodes.push(node);
}

fs.mkdirSync(outDir, { recursive: true });
const payload = {
  generatedAt: new Date().toISOString(),
  universe: 'CrSaSo',
  nodes,
  edges,
};
fs.writeFileSync(outFile, JSON.stringify(payload, null, 2));
console.log(
  `[build-graph-crSaSo] ${nodes.length} nodos, ${edges.length} aristas → ${posix(path.relative(root, outFile))}`,
);
