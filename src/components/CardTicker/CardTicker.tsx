import React, {useRef, useEffect, useState} from 'react';
import Link from '@docusaurus/Link';
import styles from './cardTicker.module.css';

export type TickerCard = {
  /** Título visible de la tarjeta */
  title: string;
  /** Emoji, símbolo o texto corto usado como ícono */
  icon: string;
  /** Descripción o subtítulo breve */
  text: string;
  /** Ruta interna (Docusaurus Link) o URL externa */
  to: string;
  /** Abre en nueva pestaña si es enlace externo */
  external?: boolean;
};

type Props = {
  cards: TickerCard[];
  /** Píxeles por segundo. Por defecto 60. */
  speed?: number;
  /** Pausa la animación al hacer hover. Por defecto true. */
  pauseOnHover?: boolean;
};

export default function CardTicker({
  cards,
  speed = 60,
  pauseOnHover = true,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    // Mide el primer "set" de tarjetas (la mitad del track duplicado)
    const halfWidth = el.scrollWidth / 2;
    setDuration(halfWidth / speed);
  }, [cards, speed]);

  if (!cards.length) return null;

  // Duplicamos la lista para el loop sin salto
  const doubled = [...cards, ...cards];

  return (
    <div
      className={styles.viewport}
      aria-label="Sección de navegación rápida">
      <div
        ref={trackRef}
        className={styles.track}
        style={
          duration != null
            ? ({
                '--ticker-duration': `${duration}s`,
                '--ticker-pause': pauseOnHover ? 'paused' : 'running',
              } as React.CSSProperties)
            : {visibility: 'hidden'}
        }>
        {doubled.map((card, i) => (
          <Link
            key={`${card.to}-${i}`}
            to={card.to}
            {...(card.external
              ? {target: '_blank', rel: 'noopener noreferrer'}
              : {})}
            className={styles.cardLink}
            aria-label={card.title}>
            <article className={styles.card}>
              <span className={styles.icon} aria-hidden="true">
                {card.icon}
              </span>
              <h3 className={styles.title}>{card.title}</h3>
              <p className={styles.text}>{card.text}</p>
            </article>
          </Link>
        ))}
      </div>
    </div>
  );
}
