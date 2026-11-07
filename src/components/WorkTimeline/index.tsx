import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Heading from '@theme/Heading';
import useCodiceData from '@site/src/data/useCodiceData';
import styles from './workTimeline.module.css';

/** Sección de portada: cronología de escritura, publicaciones y proyectos futuros. */
export default function WorkTimeline() {
  const codice = useCodiceData();
  const title = codice?.site.timelineTitle || 'Cronología de la obra';
  const subtitle = codice?.site.timelineSubtitle ?? 'Cuándo se escribió y publicó cada libro, y lo que viene después.';

  return (
    <section className={styles.section} aria-labelledby="work-timeline-heading">
      <div className="container">
        <header className={styles.header}>
          <Heading as="h2" id="work-timeline-heading">
            {title}
          </Heading>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </header>
        <BrowserOnly fallback={<div className={styles.skeleton} aria-hidden />}>
          {() => {
            const Board = require('./WorkTimelineBoard').default;
            // Sin datos del admin, el tablero usa src/data/authorTimeline.ts.
            return codice ? <Board lanes={codice.timeline.lanes} entries={codice.timeline.entries} /> : <Board />;
          }}
        </BrowserOnly>
      </div>
    </section>
  );
}
