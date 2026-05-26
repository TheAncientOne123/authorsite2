import React from 'react';
import clsx from 'clsx';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import styles from './wikiFloatFigure.module.css';

/**
 * Imagen flotante estilo Wikipedia/Fandom: el texto del MDX que sigue envuelve la figura.
 * Usar justo después del encabezado de sección y antes de los párrafos.
 */
export default function WikiFloatFigure({
  src,
  alt = '',
  caption,
  align = 'left',
  className,
}) {
  const {withBaseUrl} = useBaseUrlUtils();
  const resolvedSrc = src?.startsWith('http') ? src : withBaseUrl(src);

  return (
    <figure
      className={clsx(
        styles.root,
        align === 'right' && styles.rootRight,
        className,
      )}
      aria-label={alt || caption || undefined}>
      <img
        src={resolvedSrc}
        alt={alt}
        className={styles.img}
        loading="lazy"
        decoding="async"
      />
      {(caption || alt) && (
        <figcaption className={styles.caption}>{caption ?? alt}</figcaption>
      )}
    </figure>
  );
}
