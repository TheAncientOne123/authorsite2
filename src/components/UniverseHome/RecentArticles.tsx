import React, {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {useAllDocsData, useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {getCrSaSoLibroColor} from '@site/src/data/crSaSoBooks';
import {
  type CardPreviewMeta,
  formatArticleDate,
  getActivityTimestamp,
  getLibroKeyFromMeta,
  getLibroLabel,
  isRecentArticleCandidate,
  resolvePreviewImageSrc,
} from '@site/src/components/Cards/cardPreviewUtils';
import styles from './RecentArticles.module.css';

type DocLike = {
  id: string;
  path?: string;
  permalink?: string;
  title?: string;
  frontMatter?: Record<string, unknown>;
  slug?: string;
};

type VersionDocMeta = {title?: string};

type Props = {
  pluginId?: string;
  limit?: number;
};

function getDocPath(d: DocLike): string | undefined {
  return d.permalink ?? d.path;
}

function getTitle(d: DocLike, vd?: VersionDocMeta): string {
  if (vd?.title?.trim()) return vd.title.trim();
  const fm = d.frontMatter?.title;
  if (typeof fm === 'string' && fm.trim()) return fm.trim();
  if (d.title?.trim()) return d.title.trim();
  const tail = (d.slug || d.id).split('/').pop() ?? d.id;
  return tail.replace(/[-_]/g, ' ');
}

export default function RecentArticles({pluginId = 'cronicas', limit = 4}: Props) {
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);
  const {withBaseUrl} = useBaseUrlUtils();
  const previewJsonUrl = useBaseUrl('/card-preview-meta.json');
  const docVersion = useDocsVersion();
  const all = useAllDocsData();

  useEffect(() => {
    let cancelled = false;
    fetch(previewJsonUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data === 'object') {
          setPreviewPayload(data as Record<string, unknown>);
        }
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

  const versionDocsById =
    docVersion.pluginId === pluginId
      ? (docVersion.docs as Record<string, VersionDocMeta>)
      : undefined;

  const plugin = (all as Record<string, {versions?: unknown}>)[pluginId];
  const versions = plugin?.versions;
  const version = Array.isArray(versions) ? versions[0] : versions && typeof versions === 'object' ? Object.values(versions)[0] : undefined;
  const docsRaw = ((version as {docs?: DocLike[]})?.docs ?? []) as DocLike[];

  const recent = useMemo(() => {
    if (!previewByDocId) return [];

    const rows = docsRaw
      .filter((d) => isRecentArticleCandidate(d.id))
      .map((d) => {
        const meta = previewByDocId[d.id];
        const ts = getActivityTimestamp(meta);
        if (!ts) return null;
        const href = getDocPath(d);
        if (!href) return null;
        const fmLibro =
          typeof d.frontMatter?.libro === 'string' ? (d.frontMatter.libro as string) : null;
        const libroKey = getLibroKeyFromMeta(meta, fmLibro);
        const dateIso = meta?.updated ?? meta?.created;
        return {
          id: d.id,
          title: getTitle(d, versionDocsById?.[d.id]),
          href,
          meta,
          ts,
          libroKey,
          libroLabel: getLibroLabel(libroKey),
          dateLabel: formatArticleDate(dateIso),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.ts - a.ts)
      .slice(0, limit);

    return rows;
  }, [docsRaw, previewByDocId, versionDocsById, limit]);

  if (!recent.length) {
    return (
      <section className={styles.section} aria-labelledby="recent-articles-heading">
        <h2 id="recent-articles-heading">Artículos recientes</h2>
        <p className={styles.empty}>
          Aún no hay artículos con fecha en el frontmatter (<code>updated</code> o{' '}
          <code>created</code>).
        </p>
      </section>
    );
  }

  return (
    <section className={styles.section} aria-labelledby="recent-articles-heading">
      <h2 id="recent-articles-heading">Artículos recientes</h2>
      <div className={styles.grid}>
        {recent.map((item) => {
          const accent = item.libroKey ? getCrSaSoLibroColor(item.libroKey) : undefined;
          const imgSrc = item.meta?.image
            ? resolvePreviewImageSrc(item.meta.image, withBaseUrl)
            : undefined;
          return (
            <Link
              key={item.id}
              to={item.href}
              className={styles.card}
              style={
                accent
                  ? ({['--recent-libro-accent' as string]: accent} as React.CSSProperties)
                  : undefined
              }
            >
              <div className={styles.thumbWrap}>
                {imgSrc ? (
                  <img
                    src={imgSrc}
                    alt={item.meta?.imageAlt || item.title}
                    className={styles.thumb}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className={styles.thumbPlaceholder} aria-hidden />
                )}
              </div>
              <div className={styles.body}>
                <h3 className={styles.title}>{item.title}</h3>
                <div className={styles.meta}>
                  {item.dateLabel ? <span>{item.dateLabel}</span> : null}
                  {item.dateLabel && item.libroLabel ? <span aria-hidden>·</span> : null}
                  {item.libroLabel ? (
                    <span className={styles.libroBadge}>{item.libroLabel}</span>
                  ) : null}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
