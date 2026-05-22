import React from 'react';
import type {CardPreviewMeta} from './cardPreviewUtils';
import styles from './cards.module.css';

type Props = {
  title: string;
  meta: CardPreviewMeta;
};

export default function CardPreviewBubble({title, meta}: Props) {
  return (
    <div className={styles.previewPanel}>
      <div className={styles.previewTitle}>{title}</div>
      {meta.excerpt ? <p className={styles.previewExcerpt}>{meta.excerpt}</p> : null}
    </div>
  );
}
