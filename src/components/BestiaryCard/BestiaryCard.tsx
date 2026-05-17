import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import styles from './bestiaryCard.module.css';

export type BestiaryCardProps = {
  /** Imagen obligatoria: ruta bajo `/img/...` o URL absoluta */
  image: {src: string; alt: string};
  /** Título opcional encima del texto */
  title?: string;
  /** Si se indica, toda la carta enlaza a esta ruta (p. ej. `/Meridian/bestiario/dragones`). */
  to?: string;
  children: React.ReactNode;
  className?: string;
};

function resolveSrc(raw: string, withBase: (p: string) => string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  return withBase(raw.startsWith('/') ? raw : `/${raw}`);
}

export default function BestiaryCard({image, title, to, children, className}: BestiaryCardProps) {
  const {withBaseUrl} = useBaseUrlUtils();
  const src = resolveSrc(image.src, withBaseUrl);

  const article = (
    <article className={clsx(styles.card, className)}>
      <div className={styles.media}>
        <img
          className={styles.img}
          src={src}
          alt={image.alt}
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className={styles.body}>
        {title ? <h3 className={styles.title}>{title}</h3> : null}
        <div className={styles.text}>{children}</div>
      </div>
    </article>
  );

  if (to) {
    return (
      <Link to={to} className={styles.cardLink} aria-label={title ? `${title}: ver ficha` : 'Ver ficha'}>
        {article}
      </Link>
    );
  }

  return <div className={styles.cardLink}>{article}</div>;
}
