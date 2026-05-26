import React, {useEffect, useMemo, useState} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {PieSectorDataItem} from 'recharts/types/polar/Pie';
import statsData from '@site/src/data/necromancia-manuscript-stats.json';
import type {ManuscriptStats} from './manuscriptStatsTypes';
import {
  chapterLabel,
  chapterTooltipTitle,
  chaptersReliable,
  characterLegendShortLabel,
  getCharacterPieColor,
} from './manuscriptStatsUtils';
import styles from './BookManuscriptStats.module.css';

const stats = statsData as ManuscriptStats;

type ChartTheme = {
  tick: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
};

function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>({
    tick: '#6b7280',
    grid: '#e5e7eb',
    tooltipBg: '#ffffff',
    tooltipBorder: '#d1d5db',
    tooltipText: '#111827',
  });

  useEffect(() => {
    const read = () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      setTheme({
        tick: dark ? '#9ca3af' : '#6b7280',
        grid: dark ? '#374151' : '#e5e7eb',
        tooltipBg: dark ? '#1f2937' : '#ffffff',
        tooltipBorder: dark ? '#4b5563' : '#d1d5db',
        tooltipText: dark ? '#f3f4f6' : '#111827',
      });
    };
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});
    return () => obs.disconnect();
  }, []);

  return theme;
}

function tooltipStyle(theme: ChartTheme): React.CSSProperties {
  return {
    background: theme.tooltipBg,
    border: `1px solid ${theme.tooltipBorder}`,
    borderRadius: 8,
    color: theme.tooltipText,
    fontSize: 13,
  };
}

const PIE_TOP_N = 12;
const LONGEST_BAR_FILL = '#22c55e';
const DEFAULT_BAR_FILL = '#4ade80';

type PieSlice = {
  id?: string;
  name: string;
  value: number;
  share: number;
  color: string;
  isOther?: boolean;
  otherCount?: number;
};

type ChapterBarRow = {
  section: string;
  words: number;
  fullTitle: string;
  pages?: string;
  isLongest?: boolean;
};

type VocabGrowthPoint = {
  words_read: number;
  unique_types: number;
};

function CharacterPieTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: {payload: PieSlice}[];
  theme: ChartTheme;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={tooltipStyle(theme)}>
      <strong>{row.name}</strong>
      {row.isOther && row.otherCount != null ? (
        <div style={{opacity: 0.85, fontSize: 12}}>
          {row.otherCount} personajes con menos menciones
        </div>
      ) : null}
      <div>{row.value.toLocaleString('es')} menciones</div>
      <div style={{opacity: 0.85, fontSize: 12}}>{row.share.toFixed(1)} % del total</div>
    </div>
  );
}

function ChapterWordsTooltip({
  active,
  payload,
  theme,
}: {
  active?: boolean;
  payload?: {payload: ChapterBarRow}[];
  theme: ChartTheme;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={tooltipStyle(theme)}>
      <strong>{row.fullTitle}</strong>
      {row.isLongest ? (
        <div style={{opacity: 0.85, fontSize: 12}}>Parte más larga del manuscrito</div>
      ) : null}
      {row.pages ? <div style={{opacity: 0.85, fontSize: 12}}>{row.pages}</div> : null}
      <div>{row.words.toLocaleString('es')} palabras</div>
    </div>
  );
}

function VocabGrowthTooltip({
  active,
  payload,
  theme,
  totalTokens,
}: {
  active?: boolean;
  payload?: {payload: VocabGrowthPoint}[];
  theme: ChartTheme;
  totalTokens: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={tooltipStyle(theme)}>
      <div>
        Palabra {row.words_read.toLocaleString('es')} de {totalTokens.toLocaleString('es')}
      </div>
      <div>{row.unique_types.toLocaleString('es')} tipos únicos acumulados</div>
    </div>
  );
}

function pieActiveShape(
  props: PieSectorDataItem,
  stroke: string,
): React.ReactElement {
  const {outerRadius = 175, ...rest} = props;
  return (
    <Sector
      {...rest}
      outerRadius={outerRadius + 12}
      stroke={stroke}
      strokeWidth={2}
    />
  );
}

function ChapterSectionTick({
  x,
  y,
  payload,
  fill,
  fontSize,
  longestSection,
}: {
  x?: number;
  y?: number;
  payload?: {value: string};
  fill: string;
  fontSize: number;
  longestSection: string | null;
}) {
  const label = payload?.value ?? '';
  const isLongest = longestSection != null && label === longestSection;
  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fill={fill}
      fontSize={fontSize}
    >
      {isLongest ? `👑 ${label}` : label}
    </text>
  );
}

function useManuscriptChartData() {
  const reliable = chaptersReliable(stats);
  const longestChapterIndex = stats.extremes.longest_chapter?.index;

  const topCharacters = useMemo(
    () => stats.characters.totals.filter((c) => c.count > 0),
    [],
  );

  const topChartCharacters = useMemo(
    () => topCharacters.slice(0, PIE_TOP_N),
    [topCharacters],
  );

  const pieData = useMemo((): PieSlice[] => {
    const sorted = topCharacters;
    const top = sorted.slice(0, PIE_TOP_N);
    const rest = sorted.slice(PIE_TOP_N);
    const totalMentions = sorted.reduce((s, c) => s + c.count, 0);
    const rows: PieSlice[] = top.map((c) => ({
      id: c.id,
      name: c.label,
      value: c.count,
      share: c.share_percent,
      color: getCharacterPieColor(c.id),
    }));
    if (rest.length > 0) {
      const otherValue = rest.reduce((s, c) => s + c.count, 0);
      rows.push({
        name: 'Otros',
        value: otherValue,
        share: totalMentions > 0 ? (100 * otherValue) / totalMentions : 0,
        color: getCharacterPieColor(undefined, true),
        isOther: true,
        otherCount: rest.length,
      });
    }
    return rows;
  }, [topCharacters]);

  const chapterBarData = useMemo<ChapterBarRow[]>(
    () =>
      stats.chapters.map((ch) => ({
        section: chapterLabel(ch.index, ch.title, ch.page_start, ch.page_end, reliable),
        words: ch.words,
        fullTitle: ch.title,
        pages:
          ch.page_start != null && ch.page_end != null
            ? `Páginas ${ch.page_start}–${ch.page_end}`
            : undefined,
        isLongest: longestChapterIndex != null && ch.index === longestChapterIndex,
      })),
    [reliable, longestChapterIndex],
  );

  const longestSectionLabel = useMemo(
    () => chapterBarData.find((row) => row.isLongest)?.section ?? null,
    [chapterBarData],
  );

  const vocabGrowthData = useMemo(
    () => stats.lexical?.vocabulary_growth ?? [],
    [],
  );

  const chapterMeta = useMemo(
    () => new Map(stats.chapters.map((c) => [c.index, c])),
    [],
  );

  const mentionsBySectionData = useMemo(() => {
    return stats.characters.by_chapter.map((ch) => {
      const meta = chapterMeta.get(ch.index);
      const row: Record<string, string | number> = {
        section: chapterLabel(ch.index, ch.title, meta?.page_start, meta?.page_end, reliable),
        sectionFull: chapterTooltipTitle(
          ch.title,
          meta?.page_start,
          meta?.page_end,
        ),
      };
      for (const c of topChartCharacters) {
        row[c.id] = ch.mentions[c.id]?.count ?? 0;
      }
      return row;
    });
  }, [topChartCharacters, reliable, chapterMeta]);

  return {
    reliable,
    topChartCharacters,
    pieData,
    chapterBarData,
    longestSectionLabel,
    vocabGrowthData,
    mentionsBySectionData,
  };
}

export function ChapterWordsChart() {
  const chartTheme = useChartTheme();
  const {reliable, chapterBarData, longestSectionLabel} = useManuscriptChartData();

  if (chapterBarData.length === 0) return null;

  const chapterChartHeight = Math.max(280, chapterBarData.length * 42 + 48);
  const chapterAxisWidth = reliable ? 220 : 140;

  return (
    <figure className={`${styles.chartCard} ${reliable ? styles.chartCardWide : ''}`}>
      <figcaption className={styles.chartTitle}>
        {reliable ? 'Palabras por parte' : 'Palabras por sección detectada'}
      </figcaption>
      <ResponsiveContainer width="100%" height={chapterChartHeight}>
        <BarChart
          data={chapterBarData}
          layout="vertical"
          margin={{left: 4, right: 20, top: 8, bottom: 8}}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
          <XAxis type="number" tick={{fill: chartTheme.tick, fontSize: 11}} />
          <YAxis
            type="category"
            dataKey="section"
            width={chapterAxisWidth}
            tick={
              <ChapterSectionTick
                fill={chartTheme.tick}
                fontSize={reliable ? 9 : 10}
                longestSection={longestSectionLabel}
              />
            }
          />
          <Tooltip content={<ChapterWordsTooltip theme={chartTheme} />} />
          <Bar dataKey="words" radius={[0, 4, 4, 0]} name="Palabras">
            {chapterBarData.map((row) => (
              <Cell
                key={row.section}
                fill={row.isLongest ? LONGEST_BAR_FILL : DEFAULT_BAR_FILL}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function VocabularyGrowthChart() {
  const chartTheme = useChartTheme();
  const {vocabGrowthData} = useManuscriptChartData();

  if (vocabGrowthData.length === 0) return null;

  return (
    <figure className={`${styles.chartCard} ${styles.chartCardWide}`}>
      <figcaption className={styles.chartTitle}>
        Crecimiento acumulado del vocabulario
      </figcaption>
      <p className={styles.chartHint}>
        Avance cronológico del texto (eje X) frente al número de palabras únicas
        acumuladas (eje Y).
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart
          data={vocabGrowthData}
          margin={{top: 8, right: 16, left: 8, bottom: 8}}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="words_read"
            tick={{fill: chartTheme.tick, fontSize: 11}}
            tickFormatter={(v: number) => v.toLocaleString('es')}
          />
          <YAxis
            dataKey="unique_types"
            tick={{fill: chartTheme.tick, fontSize: 11}}
            tickFormatter={(v: number) => v.toLocaleString('es')}
          />
          <Tooltip
            content={
              <VocabGrowthTooltip
                theme={chartTheme}
                totalTokens={stats.lexical?.total_tokens ?? stats.global.words}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="unique_types"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            name="Tipos únicos"
          />
        </LineChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function CharacterMentionsPieChart() {
  const chartTheme = useChartTheme();
  const {pieData} = useManuscriptChartData();
  const [pieActiveIndex, setPieActiveIndex] = useState<number | undefined>(undefined);

  return (
    <figure className={`${styles.chartCard} ${styles.chartCardPie}`}>
      <figcaption className={styles.chartTitle}>Menciones por personaje</figcaption>
      <p className={styles.chartHint}>
        Los {PIE_TOP_N} personajes más citados; el resto se agrupa en «Otros».
      </p>
      <div className={styles.chartPieLayout}>
        <div className={styles.chartPieCanvas}>
          <ResponsiveContainer width="100%" height={440}>
            <PieChart margin={{top: 12, right: 8, bottom: 12, left: 8}}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={175}
                innerRadius={0}
                paddingAngle={1}
                stroke="none"
                label={false}
                activeIndex={pieActiveIndex}
                activeShape={(props) => pieActiveShape(props, chartTheme.tick)}
                onMouseEnter={(_, index) => setPieActiveIndex(index)}
                onMouseLeave={() => setPieActiveIndex(undefined)}
              >
                {pieData.map((slice, i) => (
                  <Cell
                    key={slice.name}
                    fill={slice.color}
                    opacity={
                      pieActiveIndex === undefined || pieActiveIndex === i ? 1 : 0.5
                    }
                  />
                ))}
              </Pie>
              <Tooltip content={<CharacterPieTooltip theme={chartTheme} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className={styles.pieLegend} aria-label="Leyenda del gráfico circular">
          {pieData.map((slice, i) => (
            <li
              key={slice.name}
              className={`${styles.pieLegendItem}${
                pieActiveIndex === i ? ` ${styles.pieLegendItemActive}` : ''
              }${pieActiveIndex !== undefined && pieActiveIndex !== i ? ` ${styles.pieLegendItemDimmed}` : ''}`}
              onMouseEnter={() => setPieActiveIndex(i)}
              onMouseLeave={() => setPieActiveIndex(undefined)}
              onFocus={() => setPieActiveIndex(i)}
              onBlur={() => setPieActiveIndex(undefined)}
              tabIndex={0}
            >
              <span
                className={styles.pieLegendSwatch}
                style={{backgroundColor: slice.color}}
                aria-hidden
              />
              <span className={styles.pieLegendLabel}>
                {slice.name}{' '}
                <span className={styles.pieLegendValue}>
                  ({slice.value.toLocaleString('es')})
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </figure>
  );
}

export function MentionsBySectionChart() {
  const chartTheme = useChartTheme();
  const {reliable, topChartCharacters, mentionsBySectionData} = useManuscriptChartData();

  if (mentionsBySectionData.length === 0 || topChartCharacters.length === 0) return null;

  const mentionsChartHeight = Math.max(280, mentionsBySectionData.length * 40 + 80);

  return (
    <figure className={`${styles.chartCard} ${styles.chartCardWide}`}>
      <figcaption className={styles.chartTitle}>
        {reliable
          ? 'Menciones por parte (personajes principales)'
          : 'Menciones por sección (personajes principales)'}
      </figcaption>
      <p className={styles.chartHint}>
        Los mismos {PIE_TOP_N} personajes más citados que en el gráfico circular. Las partes
        sin barras no contienen menciones nominales detectadas para ninguno de ellos.
      </p>
      <ResponsiveContainer width="100%" height={mentionsChartHeight}>
        <BarChart data={mentionsBySectionData} margin={{top: 8, right: 8, left: 0, bottom: 8}}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} />
          <XAxis
            dataKey="section"
            tick={{fill: chartTheme.tick, fontSize: 9}}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={72}
          />
          <YAxis tick={{fill: chartTheme.tick, fontSize: 11}} allowDecimals={false} />
          <Tooltip contentStyle={tooltipStyle(chartTheme)} />
          <Legend wrapperStyle={{fontSize: 11, color: chartTheme.tick}} />
          {topChartCharacters.map((c) => (
            <Bar
              key={c.id}
              dataKey={c.id}
              name={characterLegendShortLabel(c.label)}
              fill={getCharacterPieColor(c.id)}
              radius={[2, 2, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

export default function BookManuscriptStatsCharts() {
  return (
    <div className={styles.chartsStack}>
      <ChapterWordsChart />
      <VocabularyGrowthChart />
      <CharacterMentionsPieChart />
      <MentionsBySectionChart />
    </div>
  );
}
