/**
 * Libros publicados con ficha en el códice (portada, ruta interna, carrete).
 */
export type CrSaSoPublishedBook = {
  key: string;
  label: string;
  color: string;
  docRoute: string;
  cover: string;
  tagline?: string;
  year?: string;
};

export const CR_SA_SO_PUBLISHED_BOOKS: CrSaSoPublishedBook[] = [
  {
    key: 'necromancia-medianoche',
    label: 'Necromancia a Medianoche',
    color: '#4ade80',
    docRoute: '/CrSaSo/libros/Necromancia%20a%20Medianoche',
    cover:
      'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/cronicas-sangre/portadaNMLowQual',
    tagline: 'Nueva Ámsterdam, 1929.',
    year: 'Desde 2025',
  },
  {
    key: 'mujer-carmesi',
    label: 'La Mujer Carmesí',
    color: '#f87171',
    docRoute: '/CrSaSo/libros/La%20Mujer%20Carmes%C3%AD',
    cover:
      'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/cronicas-sangre/portadaNMLowQual',
    tagline: 'Continuación de la saga.',
    year: 'Próximamente',
  },
];
