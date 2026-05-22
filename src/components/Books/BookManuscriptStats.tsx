import React from 'react';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import statsData from '@site/src/data/necromancia-manuscript-stats.json';
import BookManuscriptStatsCharts from './BookManuscriptStatsCharts';
import type {ManuscriptStats} from './manuscriptStatsTypes';
import {
  PERSONAJE_PATHS,
  chaptersReliable,
  fmt,
  formatAnalyzedAt,
  formatReadingTime,
} from './manuscriptStatsUtils';
import styles from './BookManuscriptStats.module.css';

const stats = statsData as ManuscriptStats;

export default function BookManuscriptStats() {
  const {withBaseUrl} = useBaseUrlUtils();
  const reliable = chaptersReliable(stats);
  const topCharacters = stats.characters.totals.filter((c) => c.count > 0);

  return (
    <div className={styles.root}>
      <section className={styles.section}>
        <h3>Métricas globales</h3>
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Palabras</span>
            <span className={styles.metricValue}>{fmt(stats.global.words)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Oraciones</span>
            <span className={styles.metricValue}>{fmt(stats.global.sentences)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Párrafos</span>
            <span className={styles.metricValue}>{fmt(stats.global.paragraphs)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Tiempo de lectura</span>
            <span className={styles.metricValue}>
              {formatReadingTime(stats.global.reading_time_minutes)}
            </span>
          </div>
        </div>
      </section>

      <BrowserOnly fallback={<p className={styles.chartLoading}>Cargando gráficos…</p>}>
        {() => <BookManuscriptStatsCharts />}
      </BrowserOnly>

      <section className={styles.section}>
        <h3>Personajes en el análisis</h3>
        <div>
          <table className={styles.characterTable}>
            <thead>
              <tr>
                <th scope="col">Personaje</th>
                <th scope="col" className={styles.numCol}>
                  Menciones
                </th>
                <th scope="col" className={styles.numCol}>
                  % del total
                </th>
              </tr>
            </thead>
            <tbody>
              {topCharacters.map((c) => {
                const path = PERSONAJE_PATHS[c.id];
                return (
                  <tr key={c.id}>
                    <td>
                      {path ? (
                        <Link to={withBaseUrl(path)}>{c.label}</Link>
                      ) : (
                        c.label
                      )}
                    </td>
                    <td className={styles.numCol}>{fmt(c.count)}</td>
                    <td className={styles.numCol}>{c.share_percent.toFixed(2)} %</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
