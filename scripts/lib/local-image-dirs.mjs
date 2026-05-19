/** Carpetas bajo static/img/ que permanecen en el repo (no CDN). */
export const LOCAL_IMG_DIRS = ['flavicon', 'docusaurus-placeholder'];

/**
 * @param {string} pathOrUrl Ruta /img/... o ruta relativa bajo static/img
 */
export function isLocalOnlyImagePath(pathOrUrl) {
  const n = pathOrUrl.replace(/\\/g, '/').toLowerCase();
  return LOCAL_IMG_DIRS.some(
    (dir) =>
      n.includes(`/img/${dir}/`) ||
      n.startsWith(`img/${dir}/`) ||
      n.startsWith(`${dir}/`) ||
      n.includes(`/authorsite/${dir}/`),
  );
}
