import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {parseYouTubeId, youTubeEmbedUrl} from './parseYouTubeId';
import styles from './youtubeEmbed.module.css';

export type YouTubeEmbedProps = {
  /** ID de 11 caracteres o URL completa de YouTube */
  id?: string;
  /** Alias de `id`; si ambos están presentes, gana `id` */
  url?: string;
  /** Título accesible del iframe */
  title?: string;
  /** Segundo de inicio (equivalente a ?start=) */
  start?: number;
  /** Enlace “Ver en YouTube” bajo el reproductor */
  showWatchLink?: boolean;
  className?: string;
};

export default function YouTubeEmbed({
  id,
  url,
  title = 'Vídeo de YouTube',
  start,
  showWatchLink = true,
  className,
}: YouTubeEmbedProps) {
  const raw = id?.trim() || url?.trim() || '';
  const videoId = parseYouTubeId(raw);

  if (!videoId) {
    return (
      <div className={clsx(styles.fallback, className)} role="alert">
        <p>No se pudo cargar el vídeo. Indica un <code>id</code> válido o una URL de YouTube.</p>
      </div>
    );
  }

  const embedSrc = youTubeEmbedUrl(videoId, start);
  const watchHref = `https://www.youtube.com/watch?v=${videoId}${start != null && start > 0 ? `&t=${Math.floor(start)}` : ''}`;

  return (
    <figure className={clsx(styles.root, className)}>
      <div className={styles.playerWrap}>
        <iframe
          className={styles.iframe}
          src={embedSrc}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      {showWatchLink ? (
        <figcaption className={styles.caption}>
          <Link href={watchHref} className={styles.watchLink}>
            Ver en YouTube
          </Link>
        </figcaption>
      ) : null}
    </figure>
  );
}
