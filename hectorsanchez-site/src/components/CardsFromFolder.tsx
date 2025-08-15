import React from 'react';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';

/**
 * CardsFromFolder (debug-friendly)
 * - Lista documentos dentro de una carpeta del plugin de docs indicado
 * - Construye enlaces robustos aunque falten `permalink` o `slug`
 * - Mejora el fallback de título para evitar mostrar `carpeta/Nombre con espacios`
 */

type Props = {
  /** Carpeta dentro del plugin: "eventos", "familias", "lugares", "personajes", "otros" */
  folder: string;
  /** Id del plugin de docs (no el routeBasePath). Por ejemplo: "cronicas". */
  pluginId?: string;
  /** IDs a excluir si hiciera falta. */
  excludeIds?: string[];
  /** Texto por defecto si un doc no trae description. */
  descriptionFallback?: string;
  /** Modo depuración: imprime datos en consola */
  debug?: boolean;
};

type DocLike = {
  id: string;
  title?: string;
  description?: string;
  permalink?: string; // cuando existe, siempre usar
  source?: string; // ruta relativa dentro de docs/
  frontMatter?: Record<string, unknown>;
  slug?: string; // puede venir sin prefijo del basePath
  unversionedId?: string;
};

type VersionLike = {
  docs?: DocLike[];
  // Algunas builds exponen el path de la versión (usualmente coincide con routeBasePath)
  path?: string; // e.g., "/CrSaSo"
  versionPath?: string; // e.g., "/CrSaSo"
};

type PluginDataLike = {
  versions?: VersionLike[] | Record<string, VersionLike>;
};

function firstVersion(plugin: PluginDataLike | undefined): VersionLike | undefined {
  if (!plugin || !plugin.versions) return undefined;
  const v = (Array.isArray(plugin.versions)
    ? plugin.versions
    : Object.values(plugin.versions)) as VersionLike[];
  return v[0];
}

function deriveBasePrefix(version: VersionLike, docs: DocLike[]): string {
  // 1) Usa un path/route conocido de la versión si existe
  const candidate = version.versionPath || version.path;
  if (candidate) return candidate.startsWith('/') ? candidate : `/${candidate}`;

  // 2) Si no, intenta deducir del primer permalink disponible
  const withPermalink = docs.find((d) => !!d.permalink)?.permalink;
  if (withPermalink) {
    // Extrae el primer segmento de "/CrSaSo/lo-que-siga" -> "/CrSaSo"
    const parts = withPermalink.split('/').filter(Boolean);
    if (parts.length) return `/${parts[0]}`;
  }

  // 3) Fallback absoluto: raíz
  return '';
}

function prettifyFromIdOrSlug(raw: string): string {
  const base = raw.split('/').filter(Boolean).pop() ?? raw;
  return base
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

export default function CardsFromFolder({
  folder,
  pluginId = 'default',
  excludeIds = [],
  descriptionFallback = '',
  debug = false,
}: Props) {
  const all = useAllDocsData();
  const plugin = (all as Record<string, PluginDataLike>)[pluginId];
  if (!plugin) {
    if (debug) console.warn(`[CardsFromFolder] pluginId "${pluginId}" no encontrado en useAllDocsData()`);
    return null;
  }

  const version = firstVersion(plugin);
  const docsRaw = (version?.docs ?? []) as DocLike[];

  const docs = docsRaw
    .filter((d) => {
      const id = d.id || '';
      const src = d.source ?? '';

      const inById = id.split('/').includes(folder);
      const inBySource = src.split('/').includes(folder);

      const isExcluded = excludeIds.includes(id);
      const looksLikeFolderIndex = /\/index\.mdx?$/.test(src) || /(^|\/)index$/.test(id);

      return !isExcluded && !looksLikeFolderIndex && (inById || inBySource);
    })
    .sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));

  if (docs.length === 0) {
    if (debug) console.warn(`[CardsFromFolder] No se encontraron docs en carpeta "${folder}" para pluginId "${pluginId}"`);
    return null;
  }

  const basePrefix = deriveBasePrefix(version || {}, docs); // e.g., "/CrSaSo"

  const computeHref = (d: DocLike): string => {
    if (d.permalink) return d.permalink; // mejor fuente

    const raw = d.slug ?? d.id; // puede venir con espacios
    const encoded = raw
      .split('/')
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join('/');

    // Garantiza prefijo de ruta base cuando falte
    const withBase = encoded.startsWith('/') ? encoded : `/${encoded}`;
    if (!basePrefix) return withBase; // sitio en raíz

    // Evita repetir prefijo si ya viene incluido
    return withBase.startsWith(basePrefix + '/') ? withBase : `${basePrefix}${withBase}`;
  };

  return (
    <div
      style={{
        display: 'grid',
        gap: '16px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
      }}
    >
      {docs.map((d) => {
        const href = computeHref(d);
        const title =
          d.title ||
          // @ts-ignore por si Docusaurus inyecta esto en frontMatter
          (d.frontMatter as any)?.title ||
          prettifyFromIdOrSlug(d.slug || d.id);
        const desc = d.description ?? descriptionFallback;

        if (debug) console.log('[CardsFromFolder] card', { id: d.id, href, title, source: d.source, slug: d.slug, permalink: d.permalink });

        return (
          <Link
            key={d.id}
            to={href}
            style={{
              display: 'block',
              padding: '16px',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: '12px',
              background: 'var(--ifm-background-surface-color)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
            {desc ? <div style={{ opacity: 0.8 }}>{desc}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}
