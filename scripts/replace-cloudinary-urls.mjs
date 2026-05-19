/**
 * Reemplaza rutas /img/... por deliveryUrl del manifiesto de Cloudinary.
 *
 * Uso:
 *   npm run cloudinary:replace           # aplica cambios
 *   npm run cloudinary:replace:dry       # solo muestra qué cambiaría
 *   npm run cloudinary:replace -- --regenerate   # y vuelve a generar JSON estáticos
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import fg from 'fast-glob';
import { isLocalOnlyImagePath } from './lib/local-image-dirs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const manifestPath = path.join(__dirname, 'output', 'cloudinary-manifest.json');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const regenerate = args.includes('--regenerate');

/** Coincide con /img/...ext (comillas no incluidas). */
const IMG_PATH_RE = /\/img\/[^\s'"`),]+\.(?:png|jpe?g|gif|webp|svg|ico)/gi;

/** URLs de Cloudinary que deben volver a rutas locales (favicon, placeholder). */
const CLOUDINARY_LOCAL_RE =
  /https:\/\/res\.cloudinary\.com\/[^'"`\s)]+\/authorsite\/(?:flavicon|docusaurus-placeholder)\/[^'"`\s)?]+/gi;

if (!fs.existsSync(manifestPath)) {
  console.error(
    `No existe ${path.relative(root, manifestPath)}. Ejecuta primero: npm run cloudinary:upload`,
  );
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

/** @param {string} url */
function cleanDeliveryUrl(url) {
  return url.replace(/\?_a=[^&'"`\s)]+/, '');
}

/** @param {Record<string, { deliveryUrl?: string; secureUrl?: string }>} files */
function buildLookup(files) {
  /** @type {Map<string, string>} */
  const exact = new Map();
  /** Sin extensión: /img/foo/bar */
  /** @type {Map<string, string>} */
  const byStem = new Map();

  for (const [sitePath, entry] of Object.entries(files)) {
    const raw = entry.deliveryUrl || entry.secureUrl;
    if (!raw) continue;
    const url = cleanDeliveryUrl(raw);
    const lower = sitePath.toLowerCase();
    exact.set(lower, url);
    const stem = lower.replace(/\.[^.]+$/i, '');
    if (!byStem.has(stem)) byStem.set(stem, url);
  }

  return { exact, byStem };
}

const lookup = buildLookup(manifest.files);

/** @param {string} match */
function resolveUrl(match) {
  const lower = match.toLowerCase();
  return lookup.exact.get(lower) ?? lookup.byStem.get(lower.replace(/\.[^.]+$/i, ''));
}

/**
 * @param {string} content
 * @param {Record<string, { publicId?: string }>} files
 */
function revertLocalCloudinaryUrls(content, files) {
  /** @type {Map<string, string>} publicId suffix → sitePath */
  const byPublicSuffix = new Map();
  for (const [sitePath, entry] of Object.entries(files)) {
    if (!isLocalOnlyImagePath(sitePath) || !entry.publicId) continue;
    const suffix = entry.publicId.replace(/^authorsite\//, '').toLowerCase();
    byPublicSuffix.set(suffix, sitePath);
  }

  return content.replace(CLOUDINARY_LOCAL_RE, (url) => {
    const m = url.match(/authorsite\/((?:flavicon|docusaurus-placeholder)\/[^/?]+)/i);
    if (!m) return url;
    return byPublicSuffix.get(m[1].toLowerCase()) ?? url;
  });
}

const GLOBS = [
  'docs/**/*.{mdx,md}',
  'src/**/*.{js,jsx,ts,tsx}',
  'static/graphs/**/*.json',
  'static/card-preview-meta.json',
];

/** @type {string[]} */
const targetFiles = await fg(GLOBS, {
  cwd: root,
  absolute: true,
  ignore: ['**/node_modules/**'],
});

let filesChanged = 0;
let totalReplacements = 0;
/** @type {Set<string>} */
const missedPaths = new Set();

for (const file of targetFiles) {
  let original = fs.readFileSync(file, 'utf8');
  let fileReplacements = 0;

  const reverted = revertLocalCloudinaryUrls(original, manifest.files);
  if (reverted !== original) {
    fileReplacements++;
    original = reverted;
  }

  const updated = original.replace(IMG_PATH_RE, (match) => {
    if (isLocalOnlyImagePath(match)) return match;
    const url = resolveUrl(match);
    if (!url) {
      missedPaths.add(match);
      return match;
    }
    if (match !== url) fileReplacements++;
    return url;
  });

  if (fileReplacements === 0) continue;

  totalReplacements += fileReplacements;
  const rel = path.relative(root, file);

  if (dryRun) {
    console.log(`[dry-run] ${rel} (${fileReplacements} reemplazo(s))`);
    continue;
  }

  fs.writeFileSync(file, updated, 'utf8');
  filesChanged++;
  console.log(`✓ ${rel} (${fileReplacements})`);
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}Archivos modificados: ${filesChanged} | Reemplazos: ${totalReplacements}`,
);

if (missedPaths.size > 0) {
  console.warn(`\nRutas sin entrada en el manifiesto (${missedPaths.size}):`);
  for (const p of [...missedPaths].sort()) {
    console.warn(`  ${p}`);
  }
}

if (!dryRun && regenerate) {
  console.log('\nRegenerando static/graphs y card-preview-meta...');
  const r1 = spawnSync('node', ['scripts/build-graph-crSaSo.mjs'], { cwd: root, stdio: 'inherit' });
  const r2 = spawnSync('node', ['scripts/build-card-preview-meta.mjs'], { cwd: root, stdio: 'inherit' });
  if (r1.status !== 0 || r2.status !== 0) process.exit(1);
}

if (!dryRun && !regenerate && filesChanged > 0) {
  console.log(
    '\nOpcional: npm run cloudinary:replace -- --regenerate  (o npm start, que regenera en prestart)',
  );
}

if (missedPaths.size > 0 && !dryRun) {
  process.exitCode = 1;
}
