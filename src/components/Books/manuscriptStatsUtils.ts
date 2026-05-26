import type {ManuscriptStats} from './manuscriptStatsTypes';

export function fmt(n: number): string {
  return n.toLocaleString('es');
}

export function formatAnalyzedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('es', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function formatReadingTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return `~${h} h ${m} min (${minutes} min)`;
}

export function isLikelyChapterHeading(title: string): boolean {
  const t = title.trim();
  if (t.length <= 48) return true;
  return /cap[ií]tulo|parte\s|ep[ií]logo|pr[oó]logo/i.test(t);
}

const PART_ROMAN: Record<string, string> = {
  Primera: 'I',
  Segunda: 'II',
  Tercera: 'III',
  Cuarta: 'IV',
  Quinta: 'V',
  Sexta: 'VI',
  Séptima: 'VII',
  Octava: 'VIII',
  Novena: 'IX',
};

/** Etiqueta corta para el eje Y/X de gráficos con muchas partes. */
export function partChartAxisLabel(title: string): string {
  const t = title.trim();
  if (/^pr[oó]logo$/i.test(t)) return 'Prólogo';
  if (/^ep[ií]logo$/i.test(t)) return 'Epílogo';
  const parts = t.split('—').map((s) => s.trim());
  if (parts.length >= 2) {
    const left = parts[0];
    const right = parts[1];
    const ord = left.match(
      /^(Primera|Segunda|Tercera|Cuarta|Quinta|Sexta|Séptima|Octava|Novena)\s+Parte/i,
    )?.[1];
    const prefix = ord ? PART_ROMAN[ord] ?? ord : left;
    const sub = right.length > 24 ? `${right.slice(0, 22)}…` : right;
    return `${prefix} · ${sub}`;
  }
  return t.length > 32 ? `${t.slice(0, 29)}…` : t;
}

export function chapterLabel(
  index: number,
  title: string,
  pageStart?: number,
  pageEnd?: number,
  reliable?: boolean,
): string {
  if (reliable) {
    return partChartAxisLabel(title);
  }
  if (isLikelyChapterHeading(title)) return title;
  if (/ep[ií]logo/i.test(title)) return 'Epílogo';
  return `Bloque ${index + 1}`;
}

export function chapterTooltipTitle(
  title: string,
  pageStart?: number,
  pageEnd?: number,
): string {
  if (pageStart != null && pageEnd != null) {
    return `${title} (págs. ${pageStart}–${pageEnd})`;
  }
  return title;
}

export const CHART_COLORS = [
  '#4ade80',
  '#60a5fa',
  '#f87171',
  '#eab93d',
  '#a78bfa',
  '#fb923c',
  '#34d399',
  '#f472b6',
  '#38bdf8',
  '#94a3b8',
];

/** Colores del pastel de menciones por personaje. */
export const CHARACTER_PIE_COLORS: Record<string, string> = {
  'anastasia-dobrescu': '#38BDF8',
  'archie-woodward': '#F87171',
  'cassian-thorne': '#4ADE80',
  'dorian-blackwood': '#F472B6',
  'ian-zaikov': '#60A5FA',
  'jayson-branch': '#34D399',
  'jessica-mccarthy': '#FB923C',
  'lucia-sinclair': '#A78BFA',
  'marco-gianotti': '#2DD4BF',
  'oliver-henderson': '#C084FC',
  'rezniv-voronin': '#64748B',
  'tamara-dobrescu': '#FACC15',
};

export const CHARACTER_PIE_OTHER_COLOR = '#94A3B8';

export function getCharacterPieColor(
  characterId: string | undefined,
  isOther?: boolean,
): string {
  if (isOther) return CHARACTER_PIE_OTHER_COLOR;
  if (characterId && CHARACTER_PIE_COLORS[characterId]) {
    return CHARACTER_PIE_COLORS[characterId];
  }
  return '#94a3b8';
}

/** Etiqueta corta para leyendas de gráficos (evita «La», «Director», etc.). */
export function characterLegendShortLabel(label: string): string {
  const parts = label.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  if (/^la\s+reina/i.test(label)) return 'Reina Oscuridad';
  const genericFirst = /^(la|el|los|las|director|sra\.?|sr\.?|subdirector|agente)$/i;
  if (genericFirst.test(parts[0]) && parts.length >= 2) {
    return parts.length === 2 ? parts[1] : `${parts[1]} ${parts[2] ?? ''}`.trim();
  }
  return parts[0];
}

export const PERSONAJE_PATHS: Record<string, string> = {
  'cassian-thorne': '/CrSaSo/personajes/Cassian%20Thorne',
  'lucia-sinclair': '/CrSaSo/personajes/Lucia%20Sinclair',
  'jessica-mccarthy': '/CrSaSo/personajes/Jessica%20McCarthy',
  'alan-mccarthy': '/CrSaSo/personajes/Alan%20McCarthy',
  'tamara-dobrescu': '/CrSaSo/personajes/Tamara%20Dobrescu',
  'anastasia-dobrescu': '/CrSaSo/personajes/Anastasia%20Dobrescu',
  'archie-woodward': '/CrSaSo/personajes/Archie%20Woodward',
  'dorian-blackwood': '/CrSaSo/personajes/Dorian%20Blackwood',
  'oliver-henderson': '/CrSaSo/personajes/Oliver%20Henderson',
  'rezniv-voronin': '/CrSaSo/personajes/Rezniv%20Voronin',
};

export function chaptersReliable(stats: ManuscriptStats): boolean {
  if (stats.global.chapters_reliable === true) return true;
  if (stats.chapters_source === 'manual_pages') return true;
  return stats.chapters.some((c) => isLikelyChapterHeading(c.title));
}
