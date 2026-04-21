/**
 * Paleta y claves `libro` del frontmatter (CrSaSo).
 * Mantén las mismas claves y orden que en `src/data/crSaSoBooks.json` (usado por el script de grafo).
 */
export const CR_SA_SO_BOOKS = [
  {key: 'necromancia-medianoche', label: 'Necromancia a Medianoche', color: '#4ade80'},
  {key: 'mujer-carmesi', label: 'La Mujer Carmesí', color: '#f87171'},
  {key: 'canon-general', label: 'Canon / varios libros', color: '#60a5fa'},
] as const;

export type CrSaSoBookEntry = (typeof CR_SA_SO_BOOKS)[number];

export const CR_SA_SO_DEFAULT_LIBRO_COLOR = '#94a3b8';

const byKey = new Map<string, CrSaSoBookEntry>(
  CR_SA_SO_BOOKS.map((b) => [b.key, b]),
);

export function getCrSaSoBookByKey(key: string | null | undefined): CrSaSoBookEntry | undefined {
  if (!key) return undefined;
  return byKey.get(key);
}

export function getCrSaSoLibroColor(key: string | null | undefined): string {
  return getCrSaSoBookByKey(key)?.color ?? CR_SA_SO_DEFAULT_LIBRO_COLOR;
}

export function isValidCrSaSoLibroKey(key: string): boolean {
  return byKey.has(key);
}

function compareNormLabel(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const labelNormToKey = new Map<string, string>(
  CR_SA_SO_BOOKS.map((b) => [compareNormLabel(b.label), b.key]),
);

function slugifyLoose(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '-');
}

/**
 * Convierte variantes de clave o título de libro a la clave canónica en crSaSoBooks
 * (p. ej. "Necromancia a Medianoche", "necromancia-a-medianoche" → "necromancia-medianoche").
 */
export function normalizeCrSaSoBookFilterValue(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (byKey.has(t)) return t;
  const asSlug = slugifyLoose(t);
  if (byKey.has(asSlug)) return asSlug;
  const fromLabel = labelNormToKey.get(compareNormLabel(t));
  if (fromLabel) return fromLabel;
  if (asSlug === 'necromancia-a-medianoche') return 'necromancia-medianoche';
  return t;
}
