import React from 'react';
import clsx from 'clsx';
import styles from './infobox.module.css';

/**
 * Infobox estilo Wikipedia
 * Props:
 * - title?: string
 * - image?: { src: string; alt?: string; width?: number; height?: number }
 * - caption?: React.ReactNode
 * - rows?: Array<{ label: React.ReactNode; value: React.ReactNode }>
 * - className?: string
 * - sticky?: boolean   // fija el infobox al hacer scroll (solo desktop)
 */
export default function Infobox({
  title,
  image,
  caption,
  rows = [],
  className,
  sticky = false,
  children, // contenido libre adicional al final
}) {
  return (
    <aside
      className={clsx(styles.infobox, sticky && styles.sticky, className)}
      role="complementary"
      aria-label={title || 'Infobox'}
    >
      {title ? <div className={styles.header}>{title}</div> : null}

      {image?.src ? (
        <figure className={styles.figure}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={styles.img}
            src={image.src}
            alt={image.alt || ''}
            width={image.width || undefined}
            height={image.height || undefined}
            loading="lazy"
          />
          {caption ? <figcaption className={styles.caption}>{caption}</figcaption> : null}
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
