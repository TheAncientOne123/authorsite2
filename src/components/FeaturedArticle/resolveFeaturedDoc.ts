import type {ComponentType} from 'react';
import type {TocHeading} from './extraDocToc';

type DocModule = {default: ComponentType; toc?: TocHeading[]};

/** MDX por plugin de docs (rutas estáticas para require.context). */
const PLUGIN_CONTEXTS: Record<string, __WebpackModuleApi.RequireContext> = {
  cronicas: require.context('@site/docs/CrSaSo', true, /\.mdx$/),
  tumulo: require.context('@site/docs/tumulo', true, /\.mdx$/),
  meridian: require.context('@site/docs/meridian', true, /\.mdx$/),
  orbe: require.context('@site/docs/orbe', true, /\.mdx$/),
};

const PLUGIN_DIRS: Record<string, string> = {
  cronicas: 'docs/CrSaSo',
  tumulo: 'docs/tumulo',
  meridian: 'docs/meridian',
  orbe: 'docs/orbe',
};

const moduleCache = new Map<string, DocModule>();

function loadFeaturedModule(pluginId: string, docId: string): DocModule | null {
  const ctx = PLUGIN_CONTEXTS[pluginId];
  if (!ctx) {
    return null;
  }

  const relativePath = `./${docId}.mdx`;
  if (!ctx.keys().includes(relativePath)) {
    if (typeof console !== 'undefined') {
      console.warn(
        `[FeaturedArticle] No existe ${relativePath} en plugin "${pluginId}". Disponibles: ${ctx.keys().join(', ')}`,
      );
    }
    return null;
  }

  const cacheKey = `${pluginId}:${relativePath}`;
  let mod = moduleCache.get(cacheKey);
  if (!mod) {
    mod = ctx(relativePath) as DocModule;
    moduleCache.set(cacheKey, mod);
  }
  return mod;
}

/**
 * Resuelve el componente MDX a partir del docId del plugin (p. ej. `personajes/Logan Crane`).
 */
export function resolveFeaturedDoc(
  pluginId: string,
  docId: string,
): ComponentType | null {
  return loadFeaturedModule(pluginId, docId)?.default ?? null;
}

/** TOC compilado del MDX embebido (exportado por el loader de Docusaurus). */
export function getFeaturedDocToc(pluginId: string, docId: string): TocHeading[] {
  return loadFeaturedModule(pluginId, docId)?.toc ?? [];
}

export function getPluginDocsDir(pluginId: string): string {
  return PLUGIN_DIRS[pluginId] ?? `docs/${pluginId}`;
}
