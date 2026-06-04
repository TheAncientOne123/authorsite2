import type {ComponentType} from 'react';

type DocModule = {default: ComponentType};

/** MDX del plugin Crónicas (docs/CrSaSo). */
const cronicasDocs = require.context(
  '@site/docs/CrSaSo',
  true,
  /\.mdx$/,
) as __WebpackModuleApi.RequireContext;

const componentCache = new Map<string, ComponentType>();

/**
 * Resuelve el componente MDX a partir del docId del plugin (p. ej. `personajes/Logan Crane`).
 */
export function resolveFeaturedDoc(
  pluginId: string,
  docId: string,
): ComponentType | null {
  if (pluginId !== 'cronicas') {
    return null;
  }

  const relativePath = `./${docId}.mdx`;
  if (!cronicasDocs.keys().includes(relativePath)) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[FeaturedArticle] No existe ${relativePath}. Disponibles: ${cronicasDocs.keys().join(', ')}`,
      );
    }
    return null;
  }

  let Doc = componentCache.get(relativePath);
  if (!Doc) {
    const mod = cronicasDocs(relativePath) as DocModule;
    Doc = mod.default;
    componentCache.set(relativePath, Doc);
  }
  return Doc;
}
