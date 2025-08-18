import React, {useCallback, useMemo, useRef, useState, useEffect} from 'react';
import clsx from 'clsx';
import styles from './infobox.module.css';

/**
 * Infobox estilo Wikipedia con carrusel opcional
 * Props:
 * - title?: string
 * - image?: { src: string; alt?: string; width?: number; height?: number }
 * - images?: Array<{ src: string; alt?: string; label?: string }>
 * - caption?: React.ReactNode
 * - rows?: Array<{ label: React.ReactNode; value: React.ReactNode }>
 * - className?: string
 * - sticky?: boolean
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
  // Normaliza a un arreglo de frames; mantiene compatibilidad con `image`
  const frames = useMemo(() => {
    if (Array.isArray(images) && images.length > 0) return images;
    if (image?.src) return [{ src: image.src, alt: image.alt }];
    return [];
  }, [images, image]);

  const [prevIdx, setPrevIdx] = useState(null);
  const [anim, setAnim] = useState(false);
  const [idx, setIdx] = useState(0);
  const total = frames.length;
  const clamp = (n) => (total === 0 ? 0 : (n + total) % total);
  const goPrev = useCallback(() => {
    if (total <= 1) return;
    setIdx((i) => {
      setPrevIdx(i);
      setAnim(true);
      return clamp(i - 1);
    });
  }, [total]);

  const goNext = useCallback(() => {
    if (total <= 1) return;
    setIdx((i) => {
      setPrevIdx(i);
      setAnim(true);
      return clamp(i + 1);
    });
  }, [total]);

  const goTo = useCallback((i) => {
    setIdx((curr) => {
      const next = clamp(i);
      if (next === curr) return curr;
      setPrevIdx(curr);
      setAnim(true);
      return next;
    });
  }, [total]);

  useEffect(() => {
    if (!anim) return;
    const t = setTimeout(() => {
      setAnim(false);
      setPrevIdx(null);
    }, 220); // duración del fade
    return () => clearTimeout(t);
  }, [anim]);



  // Gestos de swipe (pointer events)
  const startX = useRef(null);
  const onPointerDown = (e) => {
    const el = e.target;
    if(el && el.closest && el.closest('button')) return;
    startX.current = e.clientX;
  };
  const onPointerUp = (e) => {
    if (startX.current == null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) {
      if (dx > 0) goPrev(); else goNext();
    }
  };
  const onPointerLeave = () => {
  startX.current = null;
};

  const onKeyDown = (e) => {
    if (total <= 1) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
  };

  return (
    <aside
      className={clsx(styles.infobox, sticky && styles.sticky, className)}
      role="complementary"
      aria-label={title || 'Infobox'}
    >
      {title ? <div className={styles.header}>{title}</div> : null}

      {total > 0 ? (
        <figure
          className={clsx(styles.figure, total > 1 && styles.figureCarousel)}
          role={total > 1 ? 'group' : undefined}
          aria-roledescription={total > 1 ? 'carrusel de imágenes' : undefined}
          aria-label={typeof title === 'string' ? title : 'Infobox media'}
          tabIndex={total > 1 ? 0 : -1}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerLeave}
        >
          <div className={styles.stage}>
            {prevIdx != null && prevIdx !== idx && (
              <img
                className={clsx(styles.img, styles.layer, styles.fadeOut)}
                src={frames[prevIdx].src}
                alt={frames[prevIdx].alt || ''}
                loading="lazy"
              />
            )}
            <img
              key={idx}
              className={clsx(styles.img, total > 1 && styles.imgIsCarousel, anim && styles.fadeIn)}
              src={frames[idx].src}
              alt={frames[idx].alt || ''}
              loading="lazy"
            />
            
            {frames[idx].label ? <span className={styles.badge}>{frames[idx].label}</span> : null}
          </div>

          {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}

          {total > 1 && (
            <>
              <button
                type="button"
                className={clsx(styles.navBtn, styles.left)}
                aria-label="Imagen anterior"
                onClick={goPrev}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                type="button"
                className={clsx(styles.navBtn, styles.right)}
                aria-label="Imagen siguiente"
                onClick={goNext}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>

              <div className={styles.dots} role="tablist" aria-label="Selector de imagen">
                {frames.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === idx}
                    aria-label={`Ir a imagen ${i + 1}`}
                    onClick={() => goTo(i)}
                    className={clsx(styles.dot, i === idx && styles.dotActive)}
                  />
                ))}
              </div>
            </>
          )}
        </figure>
      ) : null}

      {rows?.length ? (
        <table className={styles.table}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <th className={styles.label}>{r.label}</th>
                <td className={styles.value}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      {children ? <div className={styles.extra}>{children}</div> : null}
    </aside>
  );
}