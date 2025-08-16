import React from 'react';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import styles from './cards.module.css';

type Props = {
  folder: string;
  pluginId?: string;
  excludeIds?: string[];
  descriptionFallback?: string;
  debug?: boolean;
};

type DocLike = {
  id: string;
  title?: string;
  description?: string;
  permalink?: string;
  source?: string;
  frontMatter?: Record<string, unknown>;
  slug?: string;
  unversionedId?: string;
};

type VersionLike = {
  docs?: DocLike[];
  path?: string;
  versionPath?: string;
};

type PluginDataLike = {
  versions?: VersionLike[] | Record<string, VersionLike>;
};

function firstVersion(plugin: PluginDataLike | undefined): VersionLike | undefined {
  if (!plugin || !plugin.versions) return undefined;
  const v = (Array.isArray(plugin.versions) ? plugin.versions : Object.values(plugin.versions)) as VersionLike[];
  return v[0];
}

function deriveBasePrefix(version: VersionLike, docs: DocLike[]): string {
  const candidate = version.versionPath || version.path;
  if (candidate) return candidate.startsWith('/') ? candidate : `/${candidate}`;
  const withPermalink = docs.find((d) => !!d.permalink)?.permalink;
  if (withPermalink) {
    const parts = withPermalink.split('/').filter(Boolean);
    if (parts.length) return `/${parts[0]}`;
  }
  return '';
}

function prettifyFromIdOrSlug(raw: string): string {
  const base = raw.split('/').filter(Boolean).pop() ?? raw;
  return base.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
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
    if (debug) console.warn(`[CardsFromFolder] pluginId "${pluginId}" no encontrado`);
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
    if (debug) console.warn(`[CardsFromFolder] no docs en carpeta "${folder}"`);
    return null;
  }

  const basePrefix = deriveBasePrefix(version || {}, docs);

  const computeHref = (d: DocLike): string => {
    if (d.permalink) return d.permalink;
    const raw = d.slug ?? d.id;
    const encoded = raw.split('/').filter(Boolean).map((s) => encodeURIComponent(s)).join('/');
    const withBase = encoded.startsWith('/') ? encoded : `/${encoded}`;
    if (!basePrefix) return withBase;
    return withBase.startsWith(basePrefix + '/') ? withBase : `${basePrefix}${withBase}`;
  };

  return (
    <div className={styles.grid}>
      {docs.map((d) => {
        const href = computeHref(d);
        const title = d.title || (d.frontMatter as any)?.title || prettifyFromIdOrSlug(d.slug || d.id);
        const desc = d.description ?? descriptionFallback;

        return (
          <Link key={d.id} to={href} className={styles.card}>
            <div className={styles.title}>{title}</div>
            {desc ? <div className={styles.desc}>{desc}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}
