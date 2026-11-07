// Plugin local: datos de Códice Admin (src/generated/codice-data.json) para todo el sitio.
//
// - setGlobalData: universos, libros, timeline y portada → hook useCodiceData().
// - Una ruta /grafos/<ruta> por cada universo con grafo activado.
//
// Sin datos generados (aún no se ejecutó `npm run sync`), el sitio funciona como antes:
// los componentes usan src/data/* y se mantiene el grafo de Crónicas en /grafos/sangre-y-sombra.
const fs = require('node:fs');
const path = require('node:path');

const LEGACY_GRAPHS = [
  {
    routeSlug: 'sangre-y-sombra',
    title: 'Grafo de relaciones',
    jsonPath: '/graphs/crSaSo.json',
    routeBase: 'CrSaSo',
    label: 'Crónicas de Sangre y Sombra',
  },
];

/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function codiceData(context) {
  const file = path.join(context.siteDir, 'src', 'generated', 'codice-data.json');

  return {
    name: 'codice-data',

    async loadContent() {
      if (!fs.existsSync(file)) return null;
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    },

    async contentLoaded({content, actions}) {
      const {setGlobalData, createData, addRoute} = actions;
      setGlobalData(content ?? null);

      const graphs = content
        ? content.universes
            .filter((u) => u.graph)
            .map((u) => ({...u.graph, routeBase: u.routeBase, label: u.label}))
        : LEGACY_GRAPHS;

      for (const g of graphs) {
        const graphData = await createData(`graph-${g.routeSlug}.json`, JSON.stringify(g));
        addRoute({
          path: `${context.baseUrl}grafos/${g.routeSlug}`,
          component: '@site/src/components/UniverseGraph/GraphPage',
          exact: true,
          modules: {graph: graphData},
        });
      }
    },

    getPathsToWatch() {
      return [file];
    },
  };
};
