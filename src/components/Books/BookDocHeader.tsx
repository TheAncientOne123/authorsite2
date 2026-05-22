import React from 'react';
import Link from '@docusaurus/Link';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {resolvePreviewImageSrc} from '@site/src/components/Cards/cardPreviewUtils';
import styles from './BookDocHeader.module.css';

function personajeHref(name: string): string {
  const encoded = encodeURIComponent(name.trim());
  return `/CrSaSo/personajes/${encoded}`;
}

function parseMainCharacters(raw: unknown): string[] {
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

export default function BookDocHeader() {
  const {metadata} = useDoc();
  const fm = metadata.frontMatter as Record<string, unknown>;
  const {withBaseUrl} = useBaseUrlUtils();

  const title =
    typeof fm.title === 'string' && fm.title.trim()
      ? fm.title.trim()
      : metadata.title;
  const description =
    typeof fm.description === 'string' && fm.description.trim()
      ? fm.description.trim()
      : metadata.description;
  const image =
    typeof fm.image === 'string' && fm.image.trim() ? fm.image.trim() : undefined;
  const pageCount = fm.page_count;
  const wordCount = fm.word_count;
  const mainCharacters = parseMainCharacters(fm.main_characters);

  const coverSrc = image ? resolvePreviewImageSrc(image, withBaseUrl) : undefined;

  const hasStats =
    pageCount !== undefined ||
    wordCount !== undefined ||
    mainCharacters.length > 0;

  return (
    <header className={styles.hero}>
      {coverSrc ? (
        <img
          src={coverSrc}
          alt={`Portada de ${title}`}
          className={styles.cover}
          loading="eager"
        />
      ) : null}
      <div>
        {description ? <p className={styles.synopsis}>{description}</p> : null}
        {hasStats ? (
          <dl className={styles.metaGrid}>
            {pageCount !== undefined && pageCount !== '' ? (
              <div className={styles.metaItem}>
                <dt>Páginas</dt>
                <dd>{String(pageCount)}</dd>
              </div>
            ) : null}
            {wordCount !== undefined && wordCount !== '' ? (
              <div className={styles.metaItem}>
                <dt>Palabras (aprox.)</dt>
                <dd>{Number(wordCount).toLocaleString('es')}</dd>
              </div>
            ) : null}
            {mainCharacters.length > 0 ? (
              <div className={styles.metaItem} style={{gridColumn: '1 / -1'}}>
                <dt>Personajes principales</dt>
                <dd>
                  <ul className={styles.charList}>
                    {mainCharacters.map((name) => (
                      <li key={name}>
                        <Link to={withBaseUrl(personajeHref(name))}>{name}</Link>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>
    </header>
  );
}
