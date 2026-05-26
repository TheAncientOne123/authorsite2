import React, {useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {
  type CardPreviewMeta,
  resolvePreviewImageSrc,
} from '@site/src/components/Cards/cardPreviewUtils';
import styles from './familyMemberGrid.module.css';

type Props = {
  /** Doc ids relativos al plugin, p. ej. `personajes/Ian Zaikov` */
  members: string[];
  pluginId?: string;
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function FamilyMemberGrid({members, pluginId = 'cronicas'}: Props) {
  const {withBaseUrl} = useBaseUrlUtils();
  const previewJsonUrl = useBaseUrl('/card-preview-meta.json');
  const [previewPayload, setPreviewPayload] = useState<Record<string, unknown> | null>(null);
  const docVersion = useDocsVersion();

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
    const bucket = previewPayload[pluginId];
    if (!bucket || typeof bucket !== 'object') return undefined;
    return bucket as Record<string, CardPreviewMeta>;
  }, [previewPayload, pluginId]);

  const items = useMemo(() => {
    const docs = docVersion.docs as Record<string, {title?: string; permalink?: string}>;
    return members.map((id) => {
      const doc = docs[id];
      const preview = previewByDocId?.[id];
      const title = doc?.title?.trim() || id.split('/').pop() || id;
      const href =
        doc?.permalink ??
        `/CrSaSo/${id
          .split('/')
          .map((segment) => encodeURIComponent(segment))
          .join('/')}`;
      const image = preview?.image
        ? resolvePreviewImageSrc(preview.image, withBaseUrl)
        : undefined;
      const imageAlt = preview?.imageAlt || title;
      return {id, title, href, image, imageAlt};
    });
  }, [members, docVersion.docs, previewByDocId, withBaseUrl]);

  if (!items.length) return null;

  return (
    <div className={styles.grid} role="list">
      {items.map(({id, title, href, image, imageAlt}) => (
        <Link
          key={id}
          to={href}
          className={styles.cardLink}
          role="listitem"
          aria-label={`Ver ficha de ${title}`}>
          <article className={styles.card}>
            <div className={styles.media}>
              {image ? (
                <img
                  className={styles.img}
                  src={image}
                  alt={imageAlt}
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className={styles.initials} aria-hidden="true">
                  {getInitials(title)}
                </span>
              )}
            </div>
            <h3 className={styles.title}>{title}</h3>
          </article>
        </Link>
      ))}
    </div>
  );
}
