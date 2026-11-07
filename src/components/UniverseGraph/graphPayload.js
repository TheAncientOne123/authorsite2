/**
 * Normaliza el JSON de un grafo al formato que usa el visor.
 *
 * - Formato admin (scripts/sync-from-db.mjs): nodos con `group`, `route`, y `legend`/`books` incluidos.
 * - Formato heredado (scripts/build-graph-crSaSo.mjs, sin datos del admin): nodos con `category`.
 */
import {CR_SA_SO_BOOKS} from '@site/src/data/crSaSoBooks';
import {CR_SA_SO_GRAPH_LEGEND, CR_SA_SO_OTHER_COLOR} from '@site/src/data/crSaSoGraphCategories';

const OTHER_KEY = 'otros';

function legacyRoute(routeBase, id) {
  return `/${routeBase}/${id.split('/').map(encodeURIComponent).join('/')}`;
}

export function normalizeGraphPayload(json, routeBase) {
  if (Array.isArray(json.legend)) {
    return {
      title: json.title,
      legend: json.legend,
      books: json.books ?? [],
      filters: {book: true, groups: true, ...json.filters},
      settings: json.settings ?? {},
      nodes: json.nodes,
      edges: json.edges,
    };
  }
  const legendKeys = new Set(CR_SA_SO_GRAPH_LEGEND.map((c) => c.key));
  return {
    title: 'Grafo de relaciones',
    legend: [
      ...CR_SA_SO_GRAPH_LEGEND.map((c) => ({key: c.key, label: c.label, color: c.color})),
      {key: OTHER_KEY, label: 'Libros y otras rutas', color: CR_SA_SO_OTHER_COLOR},
    ],
    books: CR_SA_SO_BOOKS.map((b) => ({key: b.key, label: b.label, color: b.color})),
    filters: {book: true, groups: true},
    settings: {},
    nodes: json.nodes.map((n) => ({
      ...n,
      docId: n.id,
      group: legendKeys.has(n.category) ? n.category : OTHER_KEY,
      route: legacyRoute(routeBase, n.id),
    })),
    edges: json.edges,
  };
}
