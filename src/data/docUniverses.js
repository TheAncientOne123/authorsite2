/**
 * Tabla central de universos con docs propios.
 * Cada entrada define la ruta raíz, la etiqueta visible y el themeId
 * que se aplicará como data-universe="<themeId>" en <html>.
 * CrSaSo no tiene themeId porque usa el tema por defecto (claro/oscuro sin universo).
 *
 * @type {Array<{path: string; label: string; themeId?: string}>}
 */
const DOC_UNIVERSES = [
  {path: '/CrSaSo', label: 'Crónicas de Sangre y Sombra'},
  {path: '/Meridian', label: 'Meridian', themeId: 'meridian'},
  {path: '/orbe', label: 'El Orbe de los Destinos', themeId: 'orbe'},
  {path: '/Tumulo', label: 'El Túmulo de las Cataratas Lúgubres', themeId: 'tumulo'},
];

export default DOC_UNIVERSES;
