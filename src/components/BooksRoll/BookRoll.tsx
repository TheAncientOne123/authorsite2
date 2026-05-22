import React from 'react';
import Link from '@docusaurus/Link';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {CR_SA_SO_PUBLISHED_BOOKS, type CrSaSoPublishedBook} from '@site/src/data/crSaSoPublishedBooks';
import styles from './BookRoll.module.css';

export type Book = {
  title: string;
  href: string;
  cover: string;
  year?: string;
  tagline?: string;
};

function toBookItem(b: CrSaSoPublishedBook): Book {
  return {
    title: b.label,
    href: b.docRoute,
    cover: b.cover,
    year: b.year,
    tagline: b.tagline,
  };
}

export const books: Book[] = CR_SA_SO_PUBLISHED_BOOKS.map(toBookItem);

type Props = {
  items?: Book[];
  ariaLabel?: string;
};

function BookRoll({items = books, ariaLabel = 'Carrete de libros'}: Props) {
  const {withBaseUrl} = useBaseUrlUtils();

  return (
    <div className={styles.root}>
      <div className={styles.track} role="list" aria-label={ariaLabel}>
        {items.map((b) => (
          <article role="listitem" key={b.title} className={styles.card}>
            <Link to={withBaseUrl(b.href)} className={styles.link}>
              <img
                loading="lazy"
                src={/^https?:\/\//i.test(b.cover) ? b.cover : withBaseUrl(b.cover)}
                alt={`Portada de ${b.title}`}
                className={styles.image}
              />
              <div className={styles.body}>
                <h3 className={styles.title}>{b.title}</h3>
                <div className={styles.meta}>
                  {b.tagline}
                  {b.year ? ` • ${b.year}` : ''}
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default BookRoll;
