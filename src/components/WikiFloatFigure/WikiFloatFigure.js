import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import styles from './wikiFloatFigure.module.css';

function CreditLine({credit, creditPrefix = 'por '}) {
  if (!credit) return null;

  if (typeof credit === 'string') {
    return (
      <div className={styles.credit}>
        {creditPrefix}
        {credit}
      </div>
    );
  }

  const {href, label, to} = credit;
  const linkTo = href ?? to;
  const text = label ?? linkTo;

  if (linkTo) {
    return (
      <div className={styles.credit}>
        {creditPrefix}
        <Link to={linkTo} className={styles.creditLink}>
          {text}
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.credit}>
      {creditPrefix}
      {text}
    </div>
  );
}

/**
 * Imagen con marco y pie (subtítulo + autor/fuente).
 * align: left | right (texto envuelve) | center (bloque centrado, sin flotado).
 */
const SIZE_CLASS = {
  sm: null,
  md: 'sizeMd',
  lg: 'sizeLg',
  xl: 'sizeXl',
};

export default function WikiFloatFigure({
  src,
  image,
  alt = '',
  subtitle,
  caption,
  credit,
  author,
  source,
  creditPrefix = 'por ',
  align = 'left',
  size = 'sm',
  width,
  className,
}) {
  const {withBaseUrl} = useBaseUrlUtils();

  const rawSrc =
    typeof src === 'string' && src.trim()
      ? src.trim()
      : typeof image === 'string' && image.trim()
        ? image.trim()
        : image && typeof image === 'object' && typeof image.src === 'string'
          ? image.src.trim()
          : '';

  const resolvedAlt =
    alt ||
    (image && typeof image === 'object' && typeof image.alt === 'string'
      ? image.alt
      : '');

  const resolvedSrc = rawSrc
    ? rawSrc.startsWith('http')
      ? rawSrc
      : withBaseUrl(rawSrc)
    : undefined;

  const resolvedSubtitle = subtitle ?? caption;
  const resolvedCredit = credit ?? author ?? source;
  const hasFooter = Boolean(resolvedSubtitle || resolvedCredit);

  return (
    <figure
      className={clsx(
        styles.root,
        SIZE_CLASS[size] && styles[SIZE_CLASS[size]],
        align === 'right' && styles.rootRight,
        align === 'center' && styles.rootCenter,
        className,
      )}
      style={width ? {width, maxWidth: width} : undefined}
      aria-label={resolvedAlt || resolvedSubtitle || undefined}>
      <div className={styles.imageWrap}>
        {resolvedSrc ? (
        <img
          src={resolvedSrc}
          alt={resolvedAlt}
          className={styles.img}
          loading="lazy"
          decoding="async"
        />
        ) : (
          <div className={styles.missing} role="status">
            Falta la imagen (<code>src</code> o <code>image</code>).
          </div>
        )}
      </div>
      {hasFooter && (
        <figcaption className={styles.footer}>
          <CreditLine credit={resolvedCredit} creditPrefix={creditPrefix} />
          {resolvedSubtitle && (
            <div className={styles.subtitle}>{resolvedSubtitle}</div>
          )}
        </figcaption>
      )}
    </figure>
  );
}
