import DOC_UNIVERSES from '@site/src/data/docUniverses';

/**
 * Dado el pathname actual y el baseUrl del sitio, devuelve el themeId
 * del universo que corresponde a esa ruta, o null si no hay universo con tema propio.
 *
 * @param {string} pathname  - location.pathname (incluye baseUrl)
 * @param {string} baseUrl   - baseUrl del config de Docusaurus (ej. "/authorsite2/")
 * @param {Array<{path: string; themeId?: string | null}>} [universes] - universos del admin; por defecto docUniverses.js
 * @returns {string | null}
 */
export function getUniverseThemeId(pathname, baseUrl = '/', universes = DOC_UNIVERSES) {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  for (const u of universes) {
    if (!u.themeId) continue;
    const prefix = `${base}${u.path}`;
    if (
      pathname === prefix ||
      pathname === `${prefix}/` ||
      pathname.startsWith(`${prefix}/`)
    ) {
      return u.themeId;
    }
  }
  return null;
}
