import type {ComponentType} from 'react';
import type {TocHeading} from './extraDocToc';

type DocModule = {default: ComponentType; toc?: TocHeading[]};

/**
 * Todos los MDX de docs/ (un único require.context: sirve para cualquier universo,
 * también los creados desde Códice Admin).
 */
const ALL_DOCS: __WebpackModuleApi.RequireContext = require.context('@site/docs', true, /\.mdx$/);

/** Carpeta de cada plugin cuando no hay datos del admin (docusaurus.config.js heredado). */
const LEGACY_PLUGIN_DIRS: Record<string, string> = {
  cronicas: 'CrSaSo',
  tumulo: 'tumulo',
  meridian: 'meridian',
  orbe: 'orbe',
};

const moduleCache = new Map<string, DocModule>();

function dirFor(pluginId: string, docsDir?: string): string {
  return docsDir ?? LEGACY_PLUGIN_DIRS[pluginId] ?? pluginId;
}

function loadFeaturedModule(pluginId: string, docId: string, docsDir?: string): DocModule | null {
  const key = `./${dirFor(pluginId, docsDir)}/${docId}.mdx`;
  if (!ALL_DOCS.keys().includes(key)) {
    if (typeof console !== 'undefined') {
      console.warn(`[FeaturedArticle] No existe ${key} (plugin "${pluginId}").`);
    }
    return null;
  }
  let mod = moduleCache.get(key);
  if (!mod) {
    mod = ALL_DOCS(key) as DocModule;
    moduleCache.set(key, mod);
  }
  return mod;
}

/**
 * Resuelve el componente MDX a partir del docId del plugin (p. ej. `personajes/Logan Crane`).
 * `docsDir`: carpeta del universo bajo docs/ (de los datos del admin); si falta, se usa la heredada.
 */
export function resolveFeaturedDoc(pluginId: string, docId: string, docsDir?: string): ComponentType | null {
  return loadFeaturedModule(pluginId, docId, docsDir)?.default ?? null;
}

/** TOC compilado del MDX embebido (exportado por el loader de Docusaurus). */
export function getFeaturedDocToc(pluginId: string, docId: string, docsDir?: string): TocHeading[] {
  return loadFeaturedModule(pluginId, docId, docsDir)?.toc ?? [];
}

export function getPluginDocsDir(pluginId: string, docsDir?: string): string {
  return `docs/${dirFor(pluginId, docsDir)}`;
}
