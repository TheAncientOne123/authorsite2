import React, {useLayoutEffect, useMemo, useRef} from 'react';
import Link from '@docusaurus/Link';
import {useAllDocsData, useDocsVersion} from '@docusaurus/plugin-content-docs/client';
import {useExtraDocTocRegistrar} from './extraDocToc';
import {getPluginDocsDir, resolveFeaturedDoc} from './resolveFeaturedDoc';
import styles from './FeaturedArticle.module.css';

const EXTRA_TOC_KEY = 'featured-article';

type DocLike = {
  id: string;
  permalink?: string;
  path?: string;
  title?: string;
  frontMatter?: Record<string, unknown>;
  slug?: string;
};

type VersionDocMeta = {title?: string};

export type FeaturedArticleProps = {
  /** Id del doc en el plugin (p. ej. `personajes/Logan Crane`) */
  docId: string;
  pluginId?: string;
  title?: string;
  to?: string;
  className?: string;
};

function getDocPath(d: DocLike): string | undefined {
  return d.permalink ?? d.path;
}

function getTitle(d: DocLike, vd?: VersionDocMeta, override?: string): string {
  if (override?.trim()) return override.trim();
  if (vd?.title?.trim()) return vd.title.trim();
  const fm = d.frontMatter?.title;
  if (typeof fm === 'string' && fm.trim()) return fm.trim();
  if (d.title?.trim()) return d.title.trim();
  const tail = (d.slug || d.id).split('/').pop() ?? d.id;
  return tail.replace(/[-_]/g, ' ');
}

function findDoc(docs: DocLike[], docId: string): DocLike | undefined {
  return docs.find((d) => d.id === docId);
}

export default function FeaturedArticle({
  docId,
  pluginId = 'cronicas',
  title: titleOverride,
  to: toOverride,
  className,
}: FeaturedArticleProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const {register, unregister} = useExtraDocTocRegistrar();
  const all = useAllDocsData();
  const docVersion = useDocsVersion();

  const versionDocsById =
    docVersion.pluginId === pluginId
      ? (docVersion.docs as Record<string, VersionDocMeta>)
      : undefined;

  const Doc = useMemo(
    () => resolveFeaturedDoc(pluginId, docId),
    [pluginId, docId],
  );

  useLayoutEffect(() => {
    if (!Doc) {
      unregister(EXTRA_TOC_KEY);
      return undefined;
    }
    return () => {
      unregister(EXTRA_TOC_KEY);
    };
  }, [Doc, register, unregister]);

  const {title, href} = useMemo(() => {
    const plugin = (all as Record<string, {versions?: unknown}>)[pluginId];
    const versions = plugin?.versions;
    const version = Array.isArray(versions)
      ? versions[0]
      : versions && typeof versions === 'object'
        ? Object.values(versions)[0]
        : undefined;
    const docsRaw = ((version as {docs?: DocLike[]})?.docs ?? []) as DocLike[];
    const match = findDoc(docsRaw, docId);

    if (!match) {
      return {
        title: titleOverride?.trim() || docId,
        href: toOverride,
      };
    }

    return {
      title: getTitle(match, versionDocsById?.[docId], titleOverride),
      href: toOverride ?? getDocPath(match),
    };
  }, [all, pluginId, docId, titleOverride, toOverride, versionDocsById]);

  const rootClass = className ? `${styles.root} ${className}` : styles.root;

  const subtitle = <p className={styles.docName}>{title}</p>;

  if (!Doc) {
    return (
      <section className={rootClass}>
        {subtitle}
        <p className={styles.error}>
          No se pudo cargar la vista previa de <code>{docId}</code>. Comprueba el{' '}
          <code>docId</code> (ruta relativa al MDX en{' '}
          <code>{getPluginDocsDir(pluginId)}/</code>) y el <code>pluginId</code> (
          <code>{pluginId}</code>).
        </p>
      </section>
    );
  }

  return (
    <section className={rootClass}>
      {subtitle}
      <div className={styles.previewWrap}>
        <div
          ref={previewRef}
          className={`${styles.preview} theme-doc-markdown markdown`}
        >
          <Doc />
        </div>
        <div className={styles.previewFade} aria-hidden />
        {href ? (
          <div className={styles.readMoreWrap}>
            <Link className="button button--primary button--sm" to={href}>
              Ver ficha completa
            </Link>
          </div>
        ) : null}
      </div>
    </section>
  );
}
