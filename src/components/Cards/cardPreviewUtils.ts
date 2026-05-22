import {
  getCrSaSoBookByKey,
  normalizeCrSaSoBookFilterValue,
} from '@site/src/data/crSaSoBooks';

export type CardPreviewMeta = {
  excerpt?: string;
  image?: string;
  imageAlt?: string;
  updated?: string;
  created?: string;
  filters?: Record<string, string | string[]>;
};

export function resolvePreviewImageSrc(
  path: string,
  withBase: (p: string) => string,
): string {
  if (/^https?:\/\//i.test(path)) return path;
  return withBase(path.startsWith('/') ? path : `/${path}`);
}

export function formatArticleDate(iso?: string): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es', {day: 'numeric', month: 'short', year: 'numeric'});
}

export function getActivityTimestamp(meta?: CardPreviewMeta): number {
  const candidates = [meta?.updated, meta?.created].filter(Boolean) as string[];
  if (!candidates.length) return 0;
  const best = candidates.sort().reverse()[0];
  const t = new Date(`${best.slice(0, 10)}T12:00:00`).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function getLibroKeyFromMeta(
  meta?: CardPreviewMeta,
  fmLibro?: string | null,
): string | null {
  const filtLibro = meta?.filters?.libro;
  const libroRaw =
    fmLibro ??
    (typeof filtLibro === 'string'
      ? filtLibro
      : Array.isArray(filtLibro) && typeof filtLibro[0] === 'string'
        ? filtLibro[0]
        : null);
  return libroRaw ? normalizeCrSaSoBookFilterValue(libroRaw) : null;
}

export function getLibroLabel(key: string | null): string | null {
  if (!key) return null;
  return getCrSaSoBookByKey(key)?.label ?? null;
}

/** Excluye portadas, índice del universo y fichas de libros del feed reciente. */
export function isRecentArticleCandidate(docId: string): boolean {
  if (docId === 'index') return false;
  if (docId.endsWith('-portada')) return false;
  if (docId === 'libros/index' || docId === 'libros/index-libros') return false;
  if (docId.startsWith('libros/')) return false;
  return true;
}
