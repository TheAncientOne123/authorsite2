import React, {useEffect, useMemo, useState} from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
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
  CHART_COLORS,
  chapterLabel,
  chapterTooltipTitle,
  chaptersReliable,
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
      {row.pages ? <div style={{opacity: 0.85, fontSize: 12}}>{row.pages}</div> : null}
      <div>{row.words.toLocaleString('es')} palabras</div>
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

export default function BookManuscriptStatsCharts() {
  const chartTheme = useChartTheme();
  const reliable = chaptersReliable(stats);
  const [pieActiveIndex, setPieActiveIndex] = useState<number | undefined>(undefined);

  const topCharacters = useMemo(
    () => stats.characters.totals.filter((c) => c.count > 0),
    [],
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
      })),
    [reliable],
  );

  const heatmapChars = useMemo(() => {
    const byId = new Map(topCharacters.map((c) => [c.id, c]));
    const presentIds = new Set<string>();
    for (const ch of stats.characters.by_chapter) {
      for (const id of ch.characters_present ?? []) {
        presentIds.add(id);
      }
      if (!ch.characters_present) {
        for (const [id, mention] of Object.entries(ch.mentions)) {
          if (mention.count > 0) presentIds.add(id);
        }
      }
    }
    const base = topCharacters.slice(0, 8);
    const baseIds = new Set(base.map((c) => c.id));
    const extras = [...presentIds]
      .filter((id) => !baseIds.has(id))
      .map((id) => byId.get(id))
      .filter((c): c is (typeof topCharacters)[number] => !!c)
      .slice(0, 4);
    return [...base, ...extras].slice(0, 12);
  }, [topCharacters]);

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
      for (const c of heatmapChars) {
        row[c.id] = ch.mentions[c.id]?.count ?? 0;
      }
      return row;
    });
  }, [heatmapChars, reliable, chapterMeta]);

  const chapterChartHeight = Math.max(280, chapterBarData.length * 42 + 48);
  const chapterAxisWidth = reliable ? 200 : 120;
  const mentionsChartHeight = Math.max(280, mentionsBySectionData.length * 40 + 80);

  return (
    <div className={styles.chartsGrid}>
      <figure className={`${styles.chartCard} ${styles.chartCardPie}`}>
        <figcaption className={styles.chartTitle}>Menciones por personaje</figcaption>
        <p className={styles.chartHint}>
          Los {PIE_TOP_N} personajes más citados; el resto se agrupa en «Otros».
        </p>
        <div className={styles.chartPieWrap}>
          <ResponsiveContainer width="100%" height={440}>
            <PieChart margin={{top: 12, right: 8, bottom: 12, left: 8}}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="38%"
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
              <Legend
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  fontSize: 11,
                  color: chartTheme.tick,
                  lineHeight: 1.45,
                  maxHeight: 400,
                  overflowY: 'auto',
                }}
                formatter={(value, entry) => {
                  const row = entry.payload as PieSlice | undefined;
                  if (!row) return value;
                  return `${value} (${row.value})`;
                }}
                onMouseEnter={(_entry, index) => setPieActiveIndex(index)}
                onMouseLeave={() => setPieActiveIndex(undefined)}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </figure>

      {chapterBarData.length > 0 ? (
        <figure
          className={`${styles.chartCard} ${reliable ? styles.chartCardWide : ''}`}
        >
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
                tick={{fill: chartTheme.tick, fontSize: reliable ? 9 : 10}}
              />
              <Tooltip content={<ChapterWordsTooltip theme={chartTheme} />} />
              <Bar dataKey="words" fill="#4ade80" radius={[0, 4, 4, 0]} name="Palabras" />
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : null}

      {mentionsBySectionData.length > 0 && heatmapChars.length > 0 ? (
        <figure className={`${styles.chartCard} ${styles.chartCardWide}`}>
          <figcaption className={styles.chartTitle}>
            {reliable
              ? 'Menciones por parte (personajes principales)'
              : 'Menciones por sección (personajes principales)'}
          </figcaption>
          <p className={styles.chartHint}>
            Incluye personajes con presencia en cualquier parte, no solo los más citados
            globalmente. Las partes sin barras no contienen menciones nominales detectadas.
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
              {heatmapChars.map((c, i) => (
                <Bar
                  key={c.id}
                  dataKey={c.id}
                  name={c.label.split(' ')[0]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </figure>
      ) : null}
    </div>
  );
}
