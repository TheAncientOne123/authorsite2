import React from 'react';
import Link from '@docusaurus/Link';
import {CR_SA_SO_SAGA_BOOKS} from '@site/src/data/crSaSoSagaBooks';
import styles from './LibrosHub.module.css';

export default function LibrosHub() {
  const published = CR_SA_SO_SAGA_BOOKS.filter((b) => b.published);
  const ordered = [...CR_SA_SO_SAGA_BOOKS].sort((a, b) => a.order - b.order);

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Orden de lectura</h2>
        <p className={styles.sectionIntro}>
          La saga se lee en el orden canónico indicado abajo. Solo las obras publicadas tienen
          ficha completa en el códice; las entradas futuras aparecen como referencia.
        </p>
        <ol className={styles.orderList}>
          {ordered.map((book) => (
            <li key={book.key} className={styles.orderItem}>
              <span
                className={styles.orderBadge}
                style={{backgroundColor: book.color}}
                aria-hidden
              >
                {book.order}
              </span>
              <div className={styles.orderBody}>
                <div className={styles.orderHeader}>
                  <h3 className={styles.orderTitle}>
                    {book.published && book.docRoute ? (
                      <Link to={book.docRoute}>{book.label}</Link>
                    ) : (
                      book.label
                    )}
                  </h3>
                  <span className={book.published ? styles.statusPublished : styles.statusUpcoming}>
                    {book.published ? 'Publicado' : 'Próximamente'}
                  </span>
                  {book.year ? <span className={styles.orderMeta}>{book.year}</span> : null}
                </div>
                {book.tagline ? <p className={styles.orderMeta}>{book.tagline}</p> : null}
                {book.synopsis ? <p className={styles.orderSynopsis}>{book.synopsis}</p> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {published.length > 0 ? (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Fichas publicadas</h2>
          <div className={styles.publishedGrid}>
            {published.map((book) => (
              <article key={book.key} className={styles.publishedCard}>
                <Link to={book.docRoute!} className={styles.publishedLink}>
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={`Portada de ${book.label}`}
                      className={styles.publishedCover}
                      loading="lazy"
                    />
                  ) : null}
                  <div className={styles.publishedBody}>
                    <h3 className={styles.publishedTitle}>{book.label}</h3>
                    <p className={styles.publishedMeta}>
                      {[book.tagline, book.year].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Anotaciones y material de trabajo</h2>
        <div className={styles.placeholderCard}>
          <p>
            Esta sección reunirá notas de autor, líneas de tiempo por obra, mapas de arcos
            narrativos y otros contenidos auxiliares conforme se vayan documentando.
          </p>
          <ul>
            <li>Notas de continuidad entre libros</li>
            <li>Guías de lectura y advertencias de spoilers</li>
            <li>Material de referencia no incluido en las fichas principales</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
