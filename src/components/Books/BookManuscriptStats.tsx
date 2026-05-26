import React, {useState} from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import statsData from '@site/src/data/necromancia-manuscript-stats.json';
import {
  ChapterWordsChart,
  CharacterMentionsPieChart,
  MentionsBySectionChart,
  VocabularyGrowthChart,
} from './BookManuscriptStatsCharts';
import type {ManuscriptStats} from './manuscriptStatsTypes';
import {fmt, formatReadingTime} from './manuscriptStatsUtils';
import styles from './BookManuscriptStats.module.css';

const stats = statsData as ManuscriptStats;

function formatPercent(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)} %`;
}

type LexicalMetricId = 'ttr' | 'mattr' | 'density';

function LexicalSection() {
  const lexical = stats.lexical;
  const [hoveredMetric, setHoveredMetric] = useState<LexicalMetricId | null>(null);

  if (!lexical) return null;

  const paragraphClass = (id: LexicalMetricId) => {
    if (hoveredMetric == null) return styles.lexicalParagraph;
    return hoveredMetric === id
      ? `${styles.lexicalParagraph} ${styles.lexicalParagraphActive}`
      : `${styles.lexicalParagraph} ${styles.lexicalParagraphDimmed}`;
  };

  return (
    <section className={styles.section}>
      <h3>Riqueza léxica</h3>
      <div className={styles.lexicalMetrics}>
        <div
          className={`${styles.lexicalRow} ${styles.lexicalRowCounts}${
            hoveredMetric != null ? ` ${styles.lexicalRowDimmed}` : ''
          }`}
        >
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Palabras únicas (tipos)</span>
            <span className={styles.metricValue}>{fmt(lexical.unique_types)}</span>
          </div>
          <div className={styles.metricCard}>
            <span className={styles.metricLabel}>Tokens totales</span>
            <span className={styles.metricValue}>{fmt(lexical.total_tokens)}</span>
          </div>
        </div>
        <div className={`${styles.lexicalRow} ${styles.lexicalRowDerived}`}>
          <a
            href="#lexical-ttr"
            className={`${styles.metricCard} ${styles.lexicalMetricLink}${
              hoveredMetric === 'ttr' ? ` ${styles.lexicalMetricLinkActive}` : ''
            }`}
            onMouseEnter={() => setHoveredMetric('ttr')}
            onMouseLeave={() => setHoveredMetric(null)}
            onFocus={() => setHoveredMetric('ttr')}
            onBlur={() => setHoveredMetric(null)}
          >
            <span className={styles.metricLabel}>TTR tradicional</span>
            <span className={styles.metricValue}>
              {formatPercent(lexical.ttr_traditional)}
            </span>
          </a>
          <a
            href="#lexical-mattr"
            className={`${styles.metricCard} ${styles.lexicalMetricLink}${
              hoveredMetric === 'mattr' ? ` ${styles.lexicalMetricLinkActive}` : ''
            }`}
            onMouseEnter={() => setHoveredMetric('mattr')}
            onMouseLeave={() => setHoveredMetric(null)}
            onFocus={() => setHoveredMetric('mattr')}
            onBlur={() => setHoveredMetric(null)}
          >
            <span className={styles.metricLabel}>
              MATTR (ventana {lexical.mattr_window.toLocaleString('es')})
            </span>
            <span className={styles.metricValue}>{formatPercent(lexical.mattr)}</span>
          </a>
          <a
            href="#lexical-density"
            className={`${styles.metricCard} ${styles.lexicalMetricLink}${
              hoveredMetric === 'density' ? ` ${styles.lexicalMetricLinkActive}` : ''
            }`}
            onMouseEnter={() => setHoveredMetric('density')}
            onMouseLeave={() => setHoveredMetric(null)}
            onFocus={() => setHoveredMetric('density')}
            onBlur={() => setHoveredMetric(null)}
          >
            <span className={styles.metricLabel}>Densidad léxica</span>
            <span className={styles.metricValue}>
              {lexical.lexical_density_percent.toFixed(2)} %
            </span>
          </a>
        </div>
      </div>
      <div
        className={`${styles.lexicalProse}${
          hoveredMetric != null ? ` ${styles.lexicalProseDimmed}` : ''
        }`}
      >
        <p id="lexical-ttr" className={paragraphClass('ttr')}>
          <strong>TTR tradicional ({formatPercent(lexical.ttr_traditional)}):</strong>{' '}
          Representa la relación global entre las {fmt(lexical.unique_types)} palabras
          únicas y las {fmt(lexical.total_tokens)} palabras totales. Aunque el porcentaje
          parece bajo ({formatPercent(lexical.ttr_traditional)}), este valor está
          condicionado por la gran extensión del manuscrito, ya que las palabras
          gramaticales (de, que, el) se repiten inevitablemente a lo largo de la obra,
          estabilizando el indicador dentro de los rangos normales para la narrativa
          extensa. En textos largos de ficción, un TTR global entre 5 % y 15 % suele
          considerarse completamente normal; porcentajes demasiado altos en obras extensas
          son poco frecuentes y, en algunos casos, pueden percibirse como artificiales o
          excesivamente rebuscados para el lector promedio.
        </p>
        <p id="lexical-mattr" className={paragraphClass('mattr')}>
          <strong>MATTR o STTR (promedio móvil):</strong> Para eliminar el sesgo de la
          longitud, se segmentó el texto en bloques continuos de{' '}
          {lexical.mattr_window.toLocaleString('es')} palabras. El MATTR resultante de{' '}
          {formatPercent(lexical.mattr)} ofrece una medición real y comparable de la
          variedad de vocabulario en capítulos o escenas individuales, reflejando la
          fluidez léxica constante del autor. Dentro de este tipo de medición, valores
          cercanos al 40 % suelen indicar una riqueza léxica funcional pero moderada,
          mientras que porcentajes superiores al 50 % reflejan una variedad vocabular
          sólida y estilísticamente rica. Valores excesivamente elevados pueden incluso
          afectar la naturalidad o la claridad de lectura si el texto prioriza
          constantemente la rareza léxica sobre la fluidez narrativa.
        </p>
        <p id="lexical-density" className={paragraphClass('density')}>
          <strong>Densidad léxica:</strong> Mide el porcentaje de palabras con contenido
          semántico real (sustantivos, verbos, adjetivos) frente a las palabras
          estructurales. Un porcentaje de {lexical.lexical_density_percent.toFixed(2)} %
          demuestra la carga de información y la riqueza descriptiva del manuscrito,
          aislando el «ruido» de los conectores gramaticales. En narrativa, una densidad
          léxica entre 40 % y 60 % suele considerarse equilibrada y agradable para la
          lectura, ya que combina claridad con profundidad descriptiva. Valores demasiado
          bajos pueden percibirse como un estilo simple o repetitivo, mientras que
          densidades excesivamente altas pueden volver el texto más pesado o demandante
          para el lector.
        </p>
      </div>
    </section>
  );
}

function ManuscriptStatsVisuals() {
  return (
    <>
      <BrowserOnly fallback={<p className={styles.chartLoading}>Cargando gráfico…</p>}>
        {() => (
          <div className={styles.chartsStack}>
            <ChapterWordsChart />
          </div>
        )}
      </BrowserOnly>

      <LexicalSection />

      <BrowserOnly fallback={<p className={styles.chartLoading}>Cargando gráficos…</p>}>
        {() => (
          <div className={styles.chartsStack}>
            <VocabularyGrowthChart />
            <CharacterMentionsPieChart />
            <MentionsBySectionChart />
          </div>
        )}
      </BrowserOnly>
    </>
  );
}

export default function BookManuscriptStats() {
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

      <ManuscriptStatsVisuals />

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
              {topCharacters.map((c) => (
                <tr key={c.id}>
                  <td>{c.label}</td>
                  <td className={styles.numCol}>{fmt(c.count)}</td>
                  <td className={styles.numCol}>{c.share_percent.toFixed(2)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
