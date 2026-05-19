/**
 * Sube todas las imágenes de static/img/ a Cloudinary.
 *
 * Uso:
 *   npm run cloudinary:upload              # sube todo
 *   npm run cloudinary:upload -- --dry-run # solo lista archivos
 *   npm run cloudinary:upload -- --only cronicas-sangre
 *
 * No sube flavicon/ ni docusaurus-placeholder/ (permanecen en static/img/).
 *
 * Genera scripts/output/cloudinary-manifest.json (ruta local → URL en Cloudinary).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { cloudinary, cloudName, deliveryUrl } from './lib/cloudinary.mjs';
import { isImageFile, publicIdFromSitePath, sitePathFromFile } from './lib/cloudinary-paths.mjs';
import { isLocalOnlyImagePath } from './lib/local-image-dirs.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const staticImgRoot = path.join(root, 'static', 'img');
const outDir = path.join(__dirname, 'output');
const manifestPath = path.join(outDir, 'cloudinary-manifest.json');

const PREFIX = process.env.CLOUDINARY_FOLDER_PREFIX?.trim() || 'authorsite';
const CONCURRENCY = 3;

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyFilter = (() => {
  const i = args.indexOf('--only');
  return i >= 0 ? args[i + 1] : null;
})();

/** @type {string[]} */
const files = await fg('**/*', {
  cwd: staticImgRoot,
  onlyFiles: true,
  absolute: true,
});

const images = files
  .filter((f) => isImageFile(f))
  .filter((f) => {
    const rel = path.relative(staticImgRoot, f).split(path.sep).join('/');
    if (isLocalOnlyImagePath(rel)) return false;
    if (!onlyFilter) return true;
    return rel.includes(onlyFilter);
  });

if (images.length === 0) {
  console.log('No hay imágenes que subir en static/img/');
  process.exit(0);
}

console.log(
  `${dryRun ? '[dry-run] ' : ''}Cloudinary: ${cloudName} | prefijo: ${PREFIX} | archivos: ${images.length}`,
);

if (dryRun) {
  for (const file of images) {
    const sitePath = sitePathFromFile(staticImgRoot, file);
    const publicId = publicIdFromSitePath(sitePath, PREFIX);
    console.log(`${sitePath} → ${publicId}`);
  }
  process.exit(0);
}

/** @type {Record<string, { publicId: string; secureUrl: string; deliveryUrl: string }>} */
const manifest = {};

/**
 * @template T
 * @param {T[]} items
 * @param {number} limit
 * @param {(item: T) => Promise<void>} fn
 */
async function pool(items, limit, fn) {
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

let ok = 0;
let fail = 0;

await pool(images, CONCURRENCY, async (file) => {
  const sitePath = sitePathFromFile(staticImgRoot, file);
  const publicId = publicIdFromSitePath(sitePath, PREFIX);
  const label = path.relative(staticImgRoot, file);

  try {
    const result = await cloudinary.uploader.upload(file, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });

    manifest[sitePath] = {
      publicId: result.public_id,
      secureUrl: result.secure_url,
      deliveryUrl: deliveryUrl(result.public_id),
    };
    ok++;
    console.log(`✓ ${label}`);
  } catch (err) {
    fail++;
    console.error(`✗ ${label}:`, err?.message || err);
  }
});

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  manifestPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      cloudName,
      folderPrefix: PREFIX,
      files: manifest,
    },
    null,
    2,
  ),
  'utf8',
);

console.log(`\nListo: ${ok} subidas, ${fail} errores.`);
console.log(`Manifiesto: ${path.relative(root, manifestPath)}`);

if (fail > 0) process.exit(1);
