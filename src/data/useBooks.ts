/**
 * Libros de una saga: del admin (página «Libros») si hay datos; si no, src/data/crSaSoSagaBooks.ts.
 */
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {CR_SA_SO_SAGA_BOOKS, type CrSaSoSagaBook} from './crSaSoSagaBooks';
import useCodiceData from './useCodiceData';

/** Universo de la página actual (/CrSaSo/... → 'CrSaSo'). */
function useCurrentRouteBase(): string | null {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const rel = pathname.slice(siteConfig.baseUrl.length);
  return rel.split('/')[0] || null;
}

/**
 * Libros "de saga" del universo actual. Un libro sin portada, frase ni sinopsis
 * (p. ej. «Canon / varios libros», que solo sirve para filtrar) no se muestra.
 */
export function useSagaBooks(): CrSaSoSagaBook[] {
  const codice = useCodiceData();
  const routeBase = useCurrentRouteBase();
  if (!codice) return CR_SA_SO_SAGA_BOOKS;
  return codice.books
    .filter((b) => (!routeBase || b.universe === routeBase) && (b.cover || b.tagline || b.synopsis))
    .sort((a, b) => a.order - b.order)
    .map((b, i) => ({
      key: b.key,
      label: b.label,
      color: b.color,
      order: i + 1,
      published: b.published,
      docRoute: b.docRoute ?? undefined,
      cover: b.cover ?? undefined,
      tagline: b.tagline ?? undefined,
      year: b.year ?? undefined,
      synopsis: b.synopsis ?? undefined,
    }));
}

/** Etiqueta y color de un libro por clave (tarjetas, filtros). */
export function useBookLookup() {
  const codice = useCodiceData();
  return (key: string | null | undefined) => (key ? codice?.books.find((b) => b.key === key) ?? null : null);
}
