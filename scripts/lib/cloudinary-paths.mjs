import path from 'node:path';

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

/**
 * Ruta pública del sitio: /img/cronicas-sangre/personajes/foo.jpg
 * @param {string} staticImgRoot absolute path to static/img
 * @param {string} absoluteFile absolute path to image file
 */
export function sitePathFromFile(staticImgRoot, absoluteFile) {
  const rel = path.relative(staticImgRoot, absoluteFile);
  return `/img/${rel.split(path.sep).join('/')}`;
}

/**
 * public_id en Cloudinary (sin extensión), p. ej. authorsite/cronicas-sangre/personajes/foo
 * @param {string} sitePath
 * @param {string} [prefix]
 */
export function publicIdFromSitePath(sitePath, prefix = 'authorsite') {
  const withoutLeading = sitePath.replace(/^\//, '');
  const withoutImg = withoutLeading.replace(/^img\//, '');
  const withoutExt = withoutImg.replace(/\.[^.]+$/i, '');
  return `${prefix}/${withoutExt}`;
}

/** @param {string} filename */
export function isImageFile(filename) {
  return IMAGE_EXT.test(filename);
}
