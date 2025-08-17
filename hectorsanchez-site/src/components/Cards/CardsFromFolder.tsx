import React, {useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import {useAllDocsData} from '@docusaurus/plugin-content-docs/client';
import styles from './cards.module.css';

type Props = {
  folder: string;
  pluginId?: string;
  excludeIds?: string[];
  descriptionFallback?: string;
  debug?: boolean;
  searchPlaceholder?: string;
  initialQuery?: string;
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

function getTitle(d: DocLike){
  return d.title || (d.frontMatter as any)?.title || prettifyFromIdOrSlug(d.slug || d.id);
}


function normalize(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = normalize(query).trim();
  const src = text;
  const srcNorm = normalize(src);
  // Find all match ranges of the full query (not tokenized) for simplicity
  const ranges: [number, number][] = [];
  let idx = srcNorm.indexOf(q);
  while (idx !== -1 && q) {
    ranges.push([idx, idx + q.length]);
    idx = srcNorm.indexOf(q, idx + q.length);
  }
  if (!ranges.length) return src;
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const [start, end] of ranges) {
    parts.push(src.slice(last, start));
    parts.push(<mark key={`${start}-${end}`}>{src.slice(start, end)}</mark>);
    last = end;
  }
  parts.push(src.slice(last));
  return <>{parts}</>;
}

export default function CardsFromFolder({
  folder,
  pluginId = 'default',
  excludeIds = [],
  descriptionFallback = '',
  debug = false,
  searchPlaceholder = 'Buscar…',
  initialQuery = '',
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const all = useAllDocsData();
  const plugin = (all as Record<string, PluginDataLike>)[pluginId];
  if (!plugin) {
    if (debug) console.warn(`[CardsFromFolder] pluginId "${pluginId}" no encontrado`);
    return null;
  }

  const version = firstVersion(plugin);
  const docsRaw = (version?.docs ?? []) as DocLike[];

  // Collect and sort docs from the requested folder
  const docs = useMemo(() => {
    const list = docsRaw
      .filter((d) => {
        const id = d.id || '';
        const src = d.source ?? '';
        const inById = id.split('/').includes(folder);
        const inBySource = src.split('/').includes(folder);
        const isExcluded = excludeIds.includes(id);
        const looksLikeFolderIndex = /\/index\.mdx?$/.test(src) || /(^|\/)index$/.test(id);
        return !isExcluded && !looksLikeFolderIndex && (inById || inBySource);
      })
      .sort((a, b) => getTitle(a).localeCompare(getTitle(b)));
    return list;
  }, [docsRaw, excludeIds, folder]);

  if (docs.length === 0) {
    if (debug) console.warn(`[CardsFromFolder] no docs en carpeta "${folder}"`);
    return null;
  }

  const basePrefix = deriveBasePrefix(version || {}, docs);

  const computeHref = (d: DocLike): string => {
    if (d.permalink) return d.permalink;
    const raw = d.slug ?? d.id;
    const encoded = raw
      .split('/')
      .filter(Boolean)
      .map((s) => encodeURIComponent(s))
      .join('/');
    const withBase = encoded.startsWith('/') ? encoded : `/${encoded}`;
    if (!basePrefix) return withBase;
    return withBase.startsWith(basePrefix + '/') ? withBase : `${basePrefix}${withBase}`;
  };

  // Build a light-weight index for search across a few fields
  const indexed = useMemo(() => {
    return docs.map((d) => {
      const title = getTitle(d);
      const description = d.description ?? '';
      const idTail = d.id.split('/').pop() ?? d.id;
      const slugTail = (d.slug || '').split('/').pop() ?? '';
      const tags = Array.isArray((d.frontMatter as any)?.tags)
        ? ((d.frontMatter as any)?.tags as unknown[])
        : [];
      const joined = [title, description, idTail, slugTail, ...tags.map(String)].join(' ');
      return {d, title, description, href: computeHref(d), norm: normalize(joined)};
    });
  }, [docs]);

  // Simple AND search over whitespace tokens
  const tokens = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const filtered = useMemo(() => {
    if (!tokens.length) return indexed;
    return indexed.filter((row) => tokens.every((t) => row.norm.includes(t)));
  }, [indexed, tokens]);

  return (
    <div className={styles.wrapper ?? undefined}>
      <div className={styles.searchBar ?? undefined}>
        <input
          aria-label="Buscar tarjetas"
          className={styles.searchInput ?? undefined}
          type="text"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clearButton ?? undefined}
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      <div className={styles.searchMeta ?? undefined}>
        {tokens.length ? (
          <span>
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span>{docs.length} elementos</span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults ?? undefined}>
          Sin resultados. Intenta con otro término.
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(({d, title, description, href}) => (
            <Link key={d.id} to={href} className={styles.card}>
              <div className={styles.title}>{highlight(title, query)}</div>
              {description ? (
                <div className={styles.desc}>{highlight(description, query)}</div>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
