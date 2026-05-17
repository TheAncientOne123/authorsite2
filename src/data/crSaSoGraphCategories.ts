/**
 * Colores del grafo CrSaSo por carpeta (`category` en crSaSo.json = primer segmento del id).
 * Leyenda: solo fichas “reales”; libros/raíz van a “Otras rutas” por color.
 */
export const CR_SA_SO_OTHER_COLOR = '#a8a29e';

/** Entradas mostradas en la leyenda del grafo (sin libros ni raíz). */
export const CR_SA_SO_GRAPH_LEGEND = [
  {key: 'personajes', label: 'Personajes', color: '#38bdf8'},
  {key: 'lugares', label: 'Lugares', color: '#c084fc'},
  {key: 'eventos', label: 'Eventos', color: '#fbbf24'},
  {key: 'familias', label: 'Familias / grupos', color: '#f472b6'},
] as const;

/** Orden al agrupar conexiones bajo el grafo. */
export const CR_SA_SO_CATEGORY_SORT_ORDER = [
  'personajes',
  'lugares',
  'eventos',
  'familias',
  'libros',
  'otros',
  'raíz',
] as const;

const colorByCategory = new Map<string, string>(
  CR_SA_SO_GRAPH_LEGEND.map((c) => [c.key, c.color]),
);

const labelByCategory = new Map<string, string>(
  CR_SA_SO_GRAPH_LEGEND.map((c) => [c.key, c.label]),
);

export function getCrSaSoCategoryColor(category: string | null | undefined): string {
  const k = String(category || 'raíz').toLowerCase();
  if (k === 'libros' || k === 'raíz') return CR_SA_SO_OTHER_COLOR;
  return colorByCategory.get(k) ?? CR_SA_SO_OTHER_COLOR;
}

export function getCrSaSoCategoryLabel(category: string | null | undefined): string {
  const k = String(category || 'raíz').toLowerCase();
  if (k === 'libros' || k === 'raíz') return 'Otras rutas';
  return labelByCategory.get(k) ?? (k === 'otros' ? 'Otros' : k);
}

export function categorySortIndex(category: string | null | undefined): number {
  const k = String(category || '').toLowerCase();
  const i = CR_SA_SO_CATEGORY_SORT_ORDER.indexOf(k as (typeof CR_SA_SO_CATEGORY_SORT_ORDER)[number]);
  if (i >= 0) return i;
  return CR_SA_SO_CATEGORY_SORT_ORDER.length;
}
