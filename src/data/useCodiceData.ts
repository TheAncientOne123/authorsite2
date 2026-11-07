/**
 * Datos publicados desde Códice Admin (plugin codice-data).
 * Devuelve null si el sitio se construye sin `npm run sync` (modo archivos: src/data/*).
 */
import {usePluginData} from '@docusaurus/useGlobalData';

export type CodiceUniverse = {
  id: string;
  routeBase: string;
  pluginId: string;
  docsDir: string;
  label: string;
  description: string | null;
  cover: string | null;
  themeId: string | null;
  visibility: 'publico' | 'proximamente' | 'oculto';
  categories: {slug: string; label: string}[];
  graph: {routeSlug: string; title: string; jsonPath: string} | null;
};

export type CodiceBook = {
  key: string;
  label: string;
  color: string;
  order: number;
  published: boolean;
  universe: string | null;
  docRoute: string | null;
  cover: string | null;
  tagline: string | null;
  year: string | null;
  synopsis: string | null;
  buyUrl: string | null;
  inStore: boolean;
};

export type CodiceSite = {
  title?: string;
  tagline?: string;
  announcement?: {enabled: boolean; id: string; content: string};
  hero?: {buttonLabel: string; buttonHref: string};
  features?: {title: string; image: string; description: string}[];
  about?: {title: string; image: string; paragraphs: string[]};
  storeTitle?: string;
  timelineTitle?: string;
  timelineSubtitle?: string;
};

export type CodiceData = {
  generatedAt: string;
  site: CodiceSite;
  universes: CodiceUniverse[];
  books: CodiceBook[];
  timeline: {
    lanes: {id: string; label: string; color: string; href?: string}[];
    entries: {
      id: string;
      lane: string;
      kind: 'escritura' | 'publicacion' | 'proyecto';
      title: string;
      start: string;
      end?: string | null;
      approx?: boolean;
      description?: string;
      href?: string;
      cover?: string;
    }[];
  };
};

export default function useCodiceData(): CodiceData | null {
  return (usePluginData('codice-data') as CodiceData | null | undefined) ?? null;
}
