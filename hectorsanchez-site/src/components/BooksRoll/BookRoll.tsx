import React from 'react';
import Link from '@docusaurus/Link';
import styles from './BookRoll.module.css';

export type Book = {
  title: string;
  href: string;
  cover: string;
  year?: string;
  tagline?: string;
};

export const books: Book[] = [
  {
    title: 'Necromancia a Medianoche',
    href: 'https://www.amazon.com.mx/Necromancia-Medianoche-Historias-Oscuras-Spanish/dp/B0FHBYZWRS',
    cover: '/img/portadaNMLowQual.png',
    year: 'Desde 2025',
    tagline: 'Nueva Ámsterdam, 1929.',
  },
  // Cuando haya más libros, añádelos aquí.
];

type Props = {
  items?: Book[];
  ariaLabel?: string;
};

function BookRoll({ items = books, ariaLabel = 'Carrete de libros' }: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.track} role="list" aria-label={ariaLabel}>
        {items.map((b) => (
          <article role="listitem" key={b.title} className={styles.card}>
            <Link to={b.href} className={styles.link}>
              <img
                loading="lazy"
                src={b.cover}
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
