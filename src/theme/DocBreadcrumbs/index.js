import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import DOC_UNIVERSES from '@site/src/data/docUniverses';
import useCodiceData from '@site/src/data/useCodiceData';

const UNIVERSE_SELECTOR = '/universes';

const LABELS = {
  bestiario: 'Bestiario',
  campañas: 'Campañas',
  clases: 'Clases',
  ensayos: 'Ensayos',
  eventos: 'Eventos',
  facciones: 'Facciones',
  familias: 'Familias y Organizaciones',
  libros: 'Libros',
  'libros-portada': 'Libros',
  'objetos-conceptos': 'Objetos y conceptos',
  lugares: 'Lugares',
  mapa: 'Mapa',
  otros: 'Otros',
  personajes: 'Personajes',
  razas: 'Razas',
};

function prettify(s) {
  return s.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').replace(/\b\p{L}/gu, (m) => m.toUpperCase());
}

/**
 * @param {string} pathname
 * @param {string} base
 */
function isUnderDocsBase(pathname, base) {
  return pathname === base || pathname === `${base}/` || pathname.startsWith(`${base}/`);
}

/** Universos con su ruta, etiquetas de categoría y grafo (admin si hay datos; si no, los del repo). */
function useUniverseList() {
  const codice = useCodiceData();
  if (codice) {
    return codice.universes.map((u) => ({
      path: `/${u.routeBase}`,
      label: u.label,
      categories: Object.fromEntries(u.categories.map((c) => [c.slug, c.label])),
      graphSlug: u.graph?.routeSlug ?? null,
      graphTitle: u.graph?.title ?? 'Grafo de relaciones',
    }));
  }
  return DOC_UNIVERSES.map((u) => ({
    path: u.path,
    label: u.label,
    categories: LABELS,
    graphSlug: u.path === '/CrSaSo' ? 'sangre-y-sombra' : null,
    graphTitle: 'Grafo de relaciones',
  }));
}

export default function DocBreadcrumbs() {
  const {withBaseUrl} = useBaseUrlUtils();
  const location = useLocation();
  const universes = useUniverseList();

  let docsBasePath = '';
  let universeLabel = '';
  let resolvedBase = '';
  let universe = null;

  for (const u of universes) {
    const base = withBaseUrl(u.path);
    if (isUnderDocsBase(location.pathname, base)) {
      docsBasePath = u.path;
      universeLabel = u.label;
      resolvedBase = base;
      universe = u;
      break;
    }
  }

  if (!resolvedBase) {
    return null;
  }

  const atDocsBase =
    location.pathname === resolvedBase || location.pathname === `${resolvedBase}/`;
  const rel = location.pathname.slice(resolvedBase.length).replace(/^\/+/, '');
  const segments = rel ? rel.split('/').filter(Boolean) : [];

  let currentLabel = '';
  if (!atDocsBase) {
    if (typeof document !== 'undefined') {
      currentLabel = document.title.replace(/\s*\|\s*.+$/, '').trim();
    }
    if (!currentLabel && segments.length > 0) {
      currentLabel = prettify(decodeURIComponent(segments[segments.length - 1]));
    }
  }

  const categorySlug = segments[0];
  const categoryLabel = categorySlug ? universe.categories[categorySlug] || LABELS[categorySlug] || prettify(categorySlug) : null;
  const categoryHref = categorySlug ? withBaseUrl(`${docsBasePath}/${categorySlug}`) : null;

  // El lector llegó desde el grafo de este universo (estado de navegación o sesión).
  const fromGraph =
    !!universe.graphSlug &&
    (location.state?.fromGraph === universe.graphSlug ||
      (typeof window !== 'undefined' &&
        window.sessionStorage?.getItem('codiceFromGraph') === universe.graphSlug));

  const items = [
    {label: 'Inicio', href: withBaseUrl('/')},
    {label: 'Universos', href: withBaseUrl(UNIVERSE_SELECTOR)},
  ];

  if (fromGraph) {
    items.push({
      label: universe.graphTitle,
      href: withBaseUrl(`/grafos/${universe.graphSlug}`),
    });
  }

  items.push({label: universeLabel, href: resolvedBase});

  if (categorySlug) {
    items.push({label: categoryLabel, href: categoryHref});
  }

  const atCategoryIndex =
    categorySlug &&
    (segments.length === 1 || segments[1] === 'index' || segments[1] === 'index.mdx');

  if (!atDocsBase && !atCategoryIndex && currentLabel) {
    items.push({label: currentLabel});
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      <ul className="breadcrumbs__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className={'breadcrumbs__item' + (isLast ? ' breadcrumbs__item--active' : '')}>
              {item.href ? (
                <Link className="breadcrumbs__link" to={item.href}>
                  {item.label}
                </Link>
              ) : (
                <span className="breadcrumbs__link">{item.label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
