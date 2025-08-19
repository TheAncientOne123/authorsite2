import React from 'react';
import clsx from 'clsx';
import styles from './BookStore.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';

const books = [
  {
    title: 'El Orbe de los Destinos',
    cover: '/img/portadaLowQual.png',
    link: 'https://www.amazon.com.mx/ORBE-DESTINOS-REINO-LUDRIAN-Spanish/dp/B0D9NH2DS5',
  },
  {
    title: 'Necromancia a Medianoche',
    cover: '/img/portadaNMLowQual.png',
    link: 'https://www.amazon.com.mx/Necromancia-Medianoche-Historias-Oscuras-Spanish/dp/B0FHBYZWRS',
  },
  // Agregar más libros aquí
];

export default function BookStoreGrid() {
  return (
    <section className={clsx('container', styles.bookStore)}>
      <div className="row">
        <div className="col col--8 col--offset-2 text--center">
          <h2>Adquiere mis libros</h2>
        </div>
        <div className="row" style={{ justifyContent: 'center', gap: '2rem', marginTop: '2rem' }}>
          {books.map((book, idx) => (
            <div key={idx} className="col col--3 text--center">
              <a href={book.link} target="_blank" rel="noopener noreferrer">
                <img src={useBaseUrl(book.cover)} alt={book.title} className={styles.bookCover} />
                <button className={clsx('button button--primary button--block', styles.buyButton)}>Comprar</button>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
