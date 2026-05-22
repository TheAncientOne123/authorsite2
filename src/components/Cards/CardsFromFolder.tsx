import React, {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {useAllDocsData, useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import Tippy from '@tippyjs/react';
import {getCrSaSoLibroColor, normalizeCrSaSoBookFilterValue} from '@site/src/data/crSaSoBooks';
import CardPreviewBubble from './CardPreviewBubble';
import {
  type CardPreviewMeta,
  formatArticleDate,
  getLibroKeyFromMeta,
  getLibroLabel,
  resolvePreviewImageSrc,
} from './cardPreviewUtils';
import styles from './cards.module.css';
import 'tippy.js/dist/tippy.css';

export type FilterDimension = {
  key: string;
  label: string;
};

type Props = {
  folder: string;
  pluginId?: string;
  excludeIds?: string[];
  descriptionFallback?: string;
  debug?: boolean;
  searchPlaceholder?: string;
  initialQuery?: string;
  filterDimensions?: FilterDimension[];
};

type DocLike = {
  id: string;
  path?: string;
  permalink?: string;
  source?: string;
  title?: string;
  description?: string;
  frontMatter?: Record<string, unknown>;
  slug?: string;
  unversionedId?: string;
};

type VersionDocMeta = {
  title?: string;
  description?: string;
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

function getDocPath(d: DocLike): string | undefined {
  return d.permalink ?? d.path;
}

function deriveBasePrefix(version: VersionLike, docs: DocLike[]): string {
  const candidate = version.versionPath || version.path;
  if (candidate) return candidate.startsWith('/') ? candidate : `/${candidate}`;
  const withPath = docs.find((d) => !!getDocPath(d));
  const p = withPath ? getDocPath(withPath) : undefined;
  if (p) {
    const parts = p.split('/').filter(Boolean);
    if (parts.length) return `/${parts[0]}`;
  }
  return '';
}

function prettifyFromIdOrSlug(raw: string): string {
  const base = raw.split('/').filter(Boolean).pop() ?? raw;
  return base.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getTitle(d: DocLike, versionDoc?: VersionDocMeta): string {
  const fromVersion = versionDoc?.title?.trim();
  if (fromVersion) return fromVersion;
  const fmTitle = (d.frontMatter as {title?: unknown} | undefined)?.title;
  if (typeof fmTitle === 'string' && fmTitle.trim()) return fmTitle.trim();
  if (d.title?.trim()) return d.title.trim();
  return prettifyFromIdOrSlug(d.slug || d.id);
}

function getDescription(d: DocLike, versionDoc: VersionDocMeta | undefined, fallback: string): string {
  const fromVersion = versionDoc?.description?.trim();
  if (fromVersion) return fromVersion;
  if (d.description?.trim()) return d.description.trim();
  return fallback;
}

function normalize(text: unknown): string {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '');
}

function formatFilterOptionLabel(filterKey: string, value: string): string {
  if (filterKey === 'libro' || filterKey === 'aparicion') {
    const label = getLibroLabel(normalizeCrSaSoBookFilterValue(value));
    if (label) return label;
  }
  return value;
}

function normalizeFilterValueForKey(filterKey: string, value: string): string {
  if (filterKey === 'libro' || filterKey === 'aparicion') {
    return normalizeCrSaSoBookFilterValue(value);
  }
  return value.trim();
}

function docMatchesFilterValue(
  raw: string | string[] | undefined,
  selected: string,
  filterKey: string,
): boolean {
  if (raw === undefined) return false;
  const vals = Array.isArray(raw) ? raw : [raw];
  const normSel = normalizeFilterValueForKey(filterKey, selected);
  return vals
    .map((v) => normalizeFilterValueForKey(filterKey, String(v)))
    .includes(normSel);
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const q = normalize(query).trim();
  const src = text;
  const srcNorm = normalize(src);
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
  filterDimensions = [],
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [filterSelections, setFilterSelections] = useState<Record<string, string>>({});
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);
  const {withBaseUrl} = useBaseUrlUtils();
  const previewJsonUrl = useBaseUrl('/card-preview-meta.json');

  useEffect(() => {
    let cancelled = false;
    fetch(previewJsonUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') setPreviewPayload(data as Record<string, unknown>);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [previewJsonUrl]);

  const previewByDocId = useMemo(() => {
    if (!previewPayload) return undefined;
    const m = previewPayload[pluginId];
    if (!m || typeof m !== 'object') return undefined;
    return m as Record<string, CardPreviewMeta>;
  }, [previewPayload, pluginId]);

  const docVersion = useDocsVersion();
  const all = useAllDocsData();
  const plugin = (all as Record<string, PluginDataLike>)[pluginId];
  const version = firstVersion(plugin);
  const docsRaw = (version?.docs ?? []) as DocLike[];
  const versionDocsById =
    docVersion.pluginId === pluginId
      ? (docVersion.docs as Record<string, VersionDocMeta>)
      : undefined;

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
      .sort((a, b) =>
        getTitle(a, versionDocsById?.[a.id]).localeCompare(getTitle(b, versionDocsById?.[b.id])),
      );
    return list;
  }, [docsRaw, excludeIds, folder, versionDocsById]);

  const filterOptionSets = useMemo(() => {
    const sets = new Map<string, Set<string>>();
    for (const dim of filterDimensions) {
      sets.set(dim.key, new Set());
    }
    if (!previewByDocId || filterDimensions.length === 0) return sets;
    for (const d of docs) {
      const f = previewByDocId[d.id]?.filters;
      if (!f) continue;
      for (const dim of filterDimensions) {
        const raw = f[dim.key];
        if (raw === undefined) continue;
        const vals = Array.isArray(raw) ? raw : [raw];
        const bucket = sets.get(dim.key);
        if (!bucket) continue;
        for (const v of vals) {
          const s = String(v).trim();
          if (!s) continue;
          const canon =
            dim.key === 'libro' || dim.key === 'aparicion'
              ? normalizeCrSaSoBookFilterValue(s)
              : s;
          if (canon) bucket.add(canon);
        }
      }
    }
    return sets;
  }, [docs, previewByDocId, filterDimensions]);

  const visibleFilterDimensions = useMemo(
    () =>
      filterDimensions.filter((dim) => (filterOptionSets.get(dim.key)?.size ?? 0) > 0),
    [filterDimensions, filterOptionSets],
  );

  const basePrefix = useMemo(
    () => deriveBasePrefix(version || {}, docs),
    [version, docs],
  );

  const indexed = useMemo(() => {
    const computeHref = (d: DocLike): string => {
      const direct = getDocPath(d);
      if (direct) return direct;
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
    return docs.map((d) => {
      const vd = versionDocsById?.[d.id];
      const title = getTitle(d, vd);
      const description = getDescription(d, vd, descriptionFallback);
      const idTail = d.id.split('/').pop() ?? d.id;
      const slugTail = (d.slug || '').split('/').pop() ?? '';
      const tags = Array.isArray((d.frontMatter as {tags?: unknown})?.tags)
        ? ((d.frontMatter as {tags?: unknown[]}).tags as unknown[])
        : [];
      const joined = [title, description, idTail, slugTail, ...tags.map(String)].join(' ');
      return {d, title, description, href: computeHref(d), norm: normalize(joined)};
    });
  }, [docs, basePrefix, versionDocsById, descriptionFallback]);

  const tokens = useMemo(() => normalize(query).split(/\s+/).filter(Boolean), [query]);
  const filteredBySearch = useMemo(() => {
    if (!tokens.length) return indexed;
    return indexed.filter((row) => tokens.every((t) => row.norm.includes(t)));
  }, [indexed, tokens]);

  const filtered = useMemo(() => {
    if (!filterDimensions.length) return filteredBySearch;
    return filteredBySearch.filter((row) => {
      const f = previewByDocId?.[row.d.id]?.filters;
      for (const dim of filterDimensions) {
        const sel = filterSelections[dim.key] ?? '';
        if (!sel) continue;
        if (!docMatchesFilterValue(f?.[dim.key], sel, dim.key)) return false;
      }
      return true;
    });
  }, [filteredBySearch, filterDimensions, filterSelections, previewByDocId]);

  if (!plugin) {
    if (debug) console.warn(`[CardsFromFolder] pluginId "${pluginId}" no encontrado`);
    return null;
  }

  if (docs.length === 0) {
    if (debug) console.warn(`[CardsFromFolder] no docs en carpeta "${folder}"`);
    return null;
  }

  return (
    <div className={styles.wrapper ?? undefined}>
      {visibleFilterDimensions.length > 0 ? (
        <div className={styles.filterBar ?? undefined}>
          {visibleFilterDimensions.map((dim) => {
            const opts = filterOptionSets.get(dim.key);
            const options = opts ? [...opts].sort((a, b) => a.localeCompare(b, 'es')) : [];
            if (options.length === 0) return null;
            return (
              <label key={dim.key} className={styles.filterField}>
                <span className={styles.filterLabel}>{dim.label}</span>
                <select
                  className={styles.filterSelect}
                  value={filterSelections[dim.key] ?? ''}
                  onChange={(e) =>
                    setFilterSelections((prev) => ({...prev, [dim.key]: e.target.value}))
                  }
                  aria-label={`Filtrar por ${dim.label}`}
                >
                  <option value="">Todos</option>
                  {options.map((v) => (
                    <option key={v} value={v}>
                      {formatFilterOptionLabel(dim.key, v)}
                    </option>
                  ))}
                </select>
              </label>
            );
          })}
        </div>
      ) : null}

      <div className={styles.searchBar ?? undefined}>
        <input
          aria-label="Buscar tarjetas"
          className={styles.searchInput ?? undefined}
          type="text"
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query ? (
          <button
            type="button"
            className={styles.clearButton ?? undefined}
            onClick={() => setQuery('')}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className={styles.searchMeta ?? undefined}>
        {tokens.length ? (
          <span>
            {filtered.length} resultado{filtered.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span>
            {filtered.length} elemento{filtered.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className={styles.noResults ?? undefined}>
          Sin resultados. Prueba otros filtros o un término distinto.
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(({d, title, href}) => {
            const preview = previewByDocId?.[d.id];
            const fmLibro =
              typeof (d.frontMatter as {libro?: unknown})?.libro === 'string'
                ? (d.frontMatter as {libro: string}).libro
                : null;
            const libroKey = getLibroKeyFromMeta(preview, fmLibro);
            const accent = libroKey ? getCrSaSoLibroColor(libroKey) : undefined;
            const libroLabel = getLibroLabel(libroKey);
            const dateLabel = formatArticleDate(preview?.updated ?? preview?.created);
            const showDetails = !!(preview?.excerpt?.trim());
            const thumbSrc = preview?.image
              ? resolvePreviewImageSrc(preview.image, withBaseUrl)
              : undefined;

            const shellStyle = accent
              ? ({['--card-libro-accent' as string]: accent} as React.CSSProperties)
              : undefined;

            return (
              <div key={d.id} className={styles.cardGridSlot}>
                <div className={styles.cardShell} style={shellStyle}>
                  <Link to={href} className={styles.cardLink}>
                    {thumbSrc ? (
                      <div className={styles.cardMedia}>
                        <img
                          src={thumbSrc}
                          alt={preview?.imageAlt || title}
                          className={styles.cardThumb}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : null}
                    <div className={styles.cardBody}>
                      <div className={styles.title}>{highlight(title, query)}</div>
                      {dateLabel || libroLabel ? (
                        <div className={styles.cardMeta}>
                          {dateLabel ? <span>{dateLabel}</span> : null}
                          {dateLabel && libroLabel ? <span aria-hidden>·</span> : null}
                          {libroLabel ? (
                            <span className={styles.libroBadge}>{libroLabel}</span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </Link>
                  {showDetails ? (
                    <div className={styles.kebabWrap}>
                      <Tippy
                        className={styles.previewPopper}
                        content={
                          <CardPreviewBubble title={title} meta={preview} />
                        }
                        interactive
                        placement="bottom-end"
                        appendTo={() => document.body}
                        maxWidth={360}
                        trigger="click"
                        hideOnClick
                      >
                        <button
                          type="button"
                          className={styles.kebabBtn}
                          aria-label={`Detalles de ${title}`}
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          ⋮
                        </button>
                      </Tippy>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
