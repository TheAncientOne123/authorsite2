import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Heading from '@theme/Heading';
import ChatWidget from './ChatWidget';
import styles from './LoreChatSection.module.css';

export default function LoreChatSection() {
  return (
    <section className={styles.section} aria-labelledby="lore-chat-heading">
      <div className="container">
        <header className={styles.header}>
          <Heading as="h2" id="lore-chat-heading">
            Pregunta sobre el universo
          </Heading>
          <p className={styles.subtitle}>
            Consulta personajes, lugares, eventos y libros de Crónicas de Sangre y Sombra con
            respuestas basadas en el compendio del sitio.
          </p>
        </header>

        <BrowserOnly fallback={<div className={styles.panel}>Cargando chat…</div>}>
          {() => <ChatWidget />}
        </BrowserOnly>

        <p className={styles.disclaimer}>
          Las respuestas pueden contener spoilers. Se recomienda leer los libros antes de consultar.
        </p>
      </div>
    </section>
  );
}
