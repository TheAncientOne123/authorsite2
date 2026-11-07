/**
 * Cronología de la obra (portada): cuándo se escribió y publicó cada libro
 * y qué proyectos vienen.
 *
 * Fechas: 'AAAA', 'AAAA-MM' o 'AAAA-MM-DD'.
 * - `end: null`  → en curso (la barra se extiende hasta hoy).
 * - `approx: true` → se muestra como fecha aproximada ("c. 2023").
 *
 * ⚠️ Solo la publicación de Necromancia a Medianoche (15/01/2025) está confirmada
 * en el códice. El resto son estimaciones marcadas con `approx`: ajústalas.
 */

export type TimelineKind = 'escritura' | 'publicacion' | 'proyecto';

export type TimelineLane = {
  id: string;
  label: string;
  color: string;
  href?: string;
};

export type TimelineEntry = {
  id: string;
  lane: TimelineLane['id'];
  kind: TimelineKind;
  title: string;
  start: string;
  /** Solo barras (escritura / proyecto). `null` = en curso. */
  end?: string | null;
  approx?: boolean;
  description?: string;
  href?: string;
  cover?: string;
};

export const TIMELINE_LANES: TimelineLane[] = [
  {id: 'orbe', label: 'El Orbe de los Destinos', color: '#a78bfa', href: '/orbe'},
  {id: 'crsaso', label: 'Crónicas de Sangre y Sombra', color: '#e05a5a', href: '/CrSaSo'},
  {id: 'meridian', label: 'Meridian', color: '#34d399', href: '/Meridian'},
  {id: 'tumulo', label: 'El Túmulo', color: '#9eb8cf', href: '/Tumulo'},
];

export const TIMELINE_ENTRIES: TimelineEntry[] = [
  // ── El Orbe de los Destinos ──
  {
    id: 'orbe-escritura',
    lane: 'orbe',
    kind: 'escritura',
    title: 'Escritura de El Orbe de los Destinos',
    start: '2023-08',
    end: '2024-07',
    approx: true,
    description: 'Primer libro publicado: El Reino de Ludrian.',
  },
  {
    id: 'orbe-publicacion',
    lane: 'orbe',
    kind: 'publicacion',
    title: 'El Orbe de los Destinos',
    start: '2024-07',
    approx: true,
    description: 'Publicado en Amazon. Primer volumen: El Reino de Ludrian.',
    href: 'https://www.amazon.com.mx/ORBE-DESTINOS-REINO-LUDRIAN-Spanish/dp/B0D9NH2DS5',
    cover: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/orbe/portadaLowQual',
  },

  // ── Crónicas de Sangre y Sombra ──
  {
    id: 'nam-escritura',
    lane: 'crsaso',
    kind: 'escritura',
    title: 'Escritura de Necromancia a Medianoche',
    start: '2024-09',
    end: '2025-04',
    approx: true,
    description: '146 245 palabras · 66 capítulos en 9 partes, con prólogo y epílogo.',
  },
  {
    id: 'nam-publicacion',
    lane: 'crsaso',
    kind: 'publicacion',
    title: 'Necromancia a Medianoche',
    start: '2025-07-11',
    description: 'Primera novela de la saga. Nueva Ámsterdam, 1929.',
    href: '/CrSaSo/libros/Necromancia%20a%20Medianoche',
    cover: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/cronicas-sangre/portadaNMLowQual',
  },
  {
    id: 'mc-escritura',
    lane: 'crsaso',
    kind: 'escritura',
    title: 'Escritura de La Mujer Carmesí',
    start: '2024-09',
    end: null,
    approx: true,
    description: 'Segunda entrega de Crónicas de Sangre y Sombra, en desarrollo.',
    href: '/CrSaSo/libros/La%20Mujer%20Carmes%C3%AD',
  },
  {
    id: 'mc-publicacion',
    lane: 'crsaso',
    kind: 'proyecto',
    title: 'Publicación de La Mujer Carmesí',
    start: '2027-03',
    end: '2027-09',
    approx: true,
    description: 'Ventana de publicación prevista.',
    href: '/CrSaSo/libros/La%20Mujer%20Carmes%C3%AD',
  },

  // ── Meridian ──
  {
    id: 'meridian-wiki',
    lane: 'meridian',
    kind: 'escritura',
    title: 'Mundo y campañas de Meridian',
    start: '2025-09',
    end: null,
    approx: true,
    description: 'Facciones, clases, bestiario y campañas del universo de Meridian.',
    href: '/Meridian',
  },
  {
    id: 'meridian-proyecto',
    lane: 'meridian',
    kind: 'proyecto',
    title: 'Primera historia de Meridian',
    start: '2027-06',
    end: '2028-06',
    approx: true,
    description: 'Proyecto futuro.',
  },

  // ── El Túmulo ──
  {
    id: 'tumulo-archivo',
    lane: 'tumulo',
    kind: 'escritura',
    title: 'Ensayos y relatos standalone',
    start: '2026-06',
    end: null,
    description: 'Archivo de ensayos y libros que no forman parte de un universo mayor.',
    href: '/Tumulo',
  },
];
