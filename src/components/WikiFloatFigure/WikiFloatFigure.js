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
  const resolvedSrc = src?.startsWith('http') ? src : withBaseUrl(src);
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
      aria-label={alt || resolvedSubtitle || undefined}>
      <div className={styles.imageWrap}>
        <img
          src={resolvedSrc}
          alt={alt}
          className={styles.img}
          loading="lazy"
          decoding="async"
        />
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
