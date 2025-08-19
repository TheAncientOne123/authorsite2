import React, {useMemo, useState, useEffect, useRef} from 'react';
import clsx from 'clsx';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import styles from './infobox.module.css';

/**
 * Infobox estilo Wikipedia con carrusel opcional (JS)
 * - Usa CSS Module `infobox.module.css`
 * - Reemplaza hooks incorrectos por `withBaseUrl`
 */
export default function Infobox({
  title,
  image,
  images,
  caption,
  rows = [],
  className,
  sticky = false,
  children,
}) {
  const {withBaseUrl} = useBaseUrlUtils();

  const frames = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) return images;
    if (image && image.src) return [{src: image.src, alt: image.alt, label: image.label}];
    return [];
  }, [images, image]);

  const [idx, setIdx] = useState(0);
  const last = frames.length - 1;
  const containerRef = useRef(null);

  const goPrev = () => setIdx((i) => (i > 0 ? i - 1 : last));
  const goNext = () => setIdx((i) => (i < last ? i + 1 : 0));
  const goTo = (i) => setIdx(() => (i >= 0 && i <= last ? i : 0));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    el.addEventListener('keydown', onKey);
    return () => el.removeEventListener('keydown', onKey);
  }, [last]);

  const imgSrc = (f) => (f?.src ? withBaseUrl(f.src) : undefined);
  const current = frames[idx];

  return (
    <section
      ref={containerRef}
      tabIndex={0}
      className={clsx(styles.infobox, className, sticky && styles.sticky)}
      aria-label={title || 'Ficha'}
    >
      {title && <header className={styles.header}>{title}</header>}

      {frames.length > 0 && (
        <figure className={clsx(styles.figure, frames.length > 1 && styles.figureCarousel)}>
          <div className={styles.stage}>
            <img
              key={idx}
              src={imgSrc(current)}
              alt={current?.alt || title || ''}
              className={clsx(styles.img, frames.length > 1 && styles.imgIsCarousel, styles.fadeIn)}
              loading="lazy"
              decoding="async"
            />
            {current?.label && <span className={styles.badge}>{current.label}</span>}

            {frames.length > 1 && (
              <>
                <button type="button" className={clsx(styles.navBtn, styles.left)} aria-label="Anterior" onClick={goPrev}>‹</button>
                <button type="button" className={clsx(styles.navBtn, styles.right)} aria-label="Siguiente" onClick={goNext}>›</button>
              </>
            )}

            {frames.length > 1 && (
              <div className={styles.dots} role="tablist">
                {frames.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === idx}
                    className={clsx(styles.dot, i === idx && styles.dotActive)}
                    onClick={() => goTo(i)}
                  />
                ))}
              </div>
            )}
          </div>
          {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
        </figure>
      )}

      {rows?.length > 0 && (
        <table className={styles.table}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td className={styles.label}>{row.label}</td>
                <td className={styles.value}>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {children && <div className={styles.extra}>{children}</div>}
    </section>
  );
}
