/**
 * Libros publicados con ficha en el códice (portada, ruta interna, carrete).
 */
import {CR_SA_SO_PUBLISHED_SAGA_BOOKS, type CrSaSoSagaBook} from './crSaSoSagaBooks';

export type CrSaSoPublishedBook = {
  key: string;
  label: string;
  color: string;
  docRoute: string;
  cover: string;
  tagline?: string;
  year?: string;
};

function toPublishedBook(b: CrSaSoSagaBook): CrSaSoPublishedBook {
  return {
    key: b.key,
    label: b.label,
    color: b.color,
    docRoute: b.docRoute!,
    cover: b.cover!,
    tagline: b.tagline,
    year: b.year,
  };
}

export const CR_SA_SO_PUBLISHED_BOOKS: CrSaSoPublishedBook[] =
  CR_SA_SO_PUBLISHED_SAGA_BOOKS.map(toPublishedBook);
