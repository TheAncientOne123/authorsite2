/**
 * Orden canónico de lectura de la saga CrSaSo.
 * `published: true` → ficha pública y enlace activo; `false` → próximamente.
 */
export type CrSaSoSagaBook = {
  key: string;
  label: string;
  color: string;
  order: number;
  published: boolean;
  docRoute?: string;
  cover?: string;
  tagline?: string;
  year?: string;
  synopsis?: string;
};

export const CR_SA_SO_SAGA_BOOKS: CrSaSoSagaBook[] = [
  {
    key: 'necromancia-medianoche',
    label: 'Necromancia a Medianoche',
    color: '#4ade80',
    order: 1,
    published: true,
    docRoute: '/CrSaSo/libros/Necromancia%20a%20Medianoche',
    cover:
      'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/cronicas-sangre/portadaNMLowQual',
    tagline: 'Nueva Ámsterdam, 1929.',
    year: 'Desde 2025',
    synopsis:
      'Primera novela de la saga. Un detective y una agente federal investigan asesinatos con indicios sobrenaturales mientras corporaciones, linajes antiguos y cultos mueven sus piezas en la sombra.',
  },
  {
    key: 'mujer-carmesi',
    label: 'La Mujer Carmesí',
    color: '#f87171',
    order: 2,
    published: false,
    tagline: 'Continuación de la saga.',
    year: 'Próximamente',
    synopsis:
      'Segunda entrega anunciada. El material ampliado de esta ficha se publicará conforme avance el códice.',
  },
];

export const CR_SA_SO_PUBLISHED_SAGA_BOOKS = CR_SA_SO_SAGA_BOOKS.filter((b) => b.published);
