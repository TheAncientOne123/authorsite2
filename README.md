# El Códice (hectorsanchez-site)

Sitio estático con [Docusaurus](https://docusaurus.io/). El blog del preset está desactivado en `docusaurus.config.js`; la documentación vive en los plugins `orbe` y `cronicas`.

## Instalación

```bash
npm ci
```

## Desarrollo local

```bash
npm start
```

Antes del primer `start` o tras cambiar muchos enlaces entre MDX, se genera el JSON del grafo CrSaSo (`prestart`). Si falla la carga en `/grafos/sangre-y-sombra`, ejecuta:

```bash
node scripts/build-graph-crSaSo.mjs
```

## Grafo de relaciones (CrSaSo)

- **Ruta:** `/grafos/sangre-y-sombra` (vista inmersiva, estilo Obsidian).
- **Datos:** `static/graphs/crSaSo.json`, generado por `scripts/build-graph-crSaSo.mjs` (se ejecuta en `prebuild` y `prestart`).
- **Frontmatter opcional** en fichas `docs/CrSaSo/**` para color en el grafo y en las tarjetas de listados:

```yaml
libro: necromancia-medianoche   # o mujer-carmesi, canon-general
```

Las claves válidas y colores están en [`src/data/crSaSoBooks.ts`](src/data/crSaSoBooks.ts) y deben coincidir con [`src/data/crSaSoBooks.json`](src/data/crSaSoBooks.json) (el script de build valida contra el JSON).

## Build

```bash
npm run build
```

Genera el sitio en la carpeta `build`.

## Despliegue

El repositorio incluye un workflow de GitHub Actions que ejecuta `npm ci` y `npm run build` dentro de `hectorsanchez-site` y publica el artefacto en GitHub Pages.

Despliegue manual con la CLI de Docusaurus (rama `gh-pages`):

```bash
USE_SSH=true npm run deploy
```

o, sin SSH:

```bash
GIT_USER=<tu_usuario_de_GitHub> npm run deploy
```
