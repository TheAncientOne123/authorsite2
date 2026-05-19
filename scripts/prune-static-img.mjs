/**
 * Elimina imágenes de static/img/ ya migradas a Cloudinary.
 * Conserva flavicon/ y docusaurus-placeholder/.
 *
 * Uso:
 *   npm run cloudinary:prune-static:dry
 *   npm run cloudinary:prune-static
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOCAL_IMG_DIRS } from './lib/local-image-dirs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const staticImgRoot = path.join(__dirname, '..', 'static', 'img');
const dryRun = process.argv.includes('--dry-run');

if (!fs.existsSync(staticImgRoot)) {
  console.log('No existe static/img/');
  process.exit(0);
}

/** @type {string[]} */
const toRemove = [];

for (const name of fs.readdirSync(staticImgRoot)) {
  if (LOCAL_IMG_DIRS.includes(name)) continue;
  const full = path.join(staticImgRoot, name);
  if (fs.statSync(full).isDirectory()) {
    toRemove.push(full);
  } else {
    toRemove.push(full);
  }
}

if (toRemove.length === 0) {
  console.log('Nada que eliminar (solo carpetas locales).');
  process.exit(0);
}

for (const dir of toRemove) {
  const rel = path.relative(staticImgRoot, dir);
  if (dryRun) {
    console.log(`[dry-run] eliminaría: img/${rel}`);
    continue;
  }
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`✓ eliminado img/${rel}`);
}

console.log(
  `\n${dryRun ? '[dry-run] ' : ''}Conservado: ${LOCAL_IMG_DIRS.map((d) => `img/${d}/`).join(', ')}`,
);
