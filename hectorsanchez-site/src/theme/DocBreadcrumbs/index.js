import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';

// Ajusta a tus rutas:
const DOCS_BASE = '/CrSaSo';            // routeBasePath de Crónicas
const UNIVERSE_SELECTOR = '/universes'; // página de selector

// Mapea carpeta -> etiqueta mostrada
const LABELS = {
  eventos: 'Eventos',
  familias: 'Familias y Organizaciones',
  lugares: 'Lugares',
  personajes: 'Personajes',
  otros: 'Otros',
};

function prettify(s) {
  return s.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').replace(/\b\p{L}/gu, m => m.toUpperCase());
}

export default function DocBreadcrumbs() {
  const {withBaseUrl} = useBaseUrlUtils();
  const location = useLocation();

  const base = withBaseUrl(DOCS_BASE);
  const atDocsBase = location.pathname === base || location.pathname === base + '/';
  const inCronicas = atDocsBase || location.pathname.startsWith(base + '/');
  if (!inCronicas) return null;

  // Segmentos después de /CrSaSo
  const rel = location.pathname.slice(base.length).replace(/^\/+/, ''); // e.g. "eventos/caso-resuelto"
  const segments = rel ? rel.split('/').filter(Boolean) : [];           // ["eventos","caso-resuelto"]

  // Derivar etiqueta de la página actual (si no estamos en la portada del universo)
  let currentLabel = '';
  if (!atDocsBase) {
    if (typeof document !== 'undefined') {
      currentLabel = document.title.replace(/\s*\|\s*.+$/, '').trim();
    }
    if (!currentLabel && segments.length > 0) {
      currentLabel = prettify(decodeURIComponent(segments[segments.length - 1]));
    }
  }

  // Si hay carpeta (categoría) úsala
  const categorySlug = segments[0]; // eventos / familias / ...
  const categoryLabel = categorySlug ? (LABELS[categorySlug] || prettify(categorySlug)) : null;
  const categoryHref = categorySlug ? withBaseUrl(`${DOCS_BASE}/${categorySlug}`) : null;

  const items = [
    { label: 'Inicio', href: withBaseUrl('/') },
    { label: 'Universos', href: withBaseUrl(UNIVERSE_SELECTOR) },
    { label: 'Crónicas de Sangre y Sombra', href: base },
  ];

  // Añadir categoría si corresponde
  if (categorySlug) {
    items.push({ label: categoryLabel, href: categoryHref });
  }

  // Añadir hoja (doc actual), excepto cuando estás en la portada del universo
  // o en la portada de la categoría (p. ej. /CrSaSo/eventos)
  const atCategoryIndex =
    categorySlug && (segments.length === 1 || segments[1] === 'index' || segments[1] === 'index.mdx');

  if (!atDocsBase && !atCategoryIndex && currentLabel) {
    items.push({ label: currentLabel });
  }

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumbs">
      <ul className="breadcrumbs__list">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={i} className={'breadcrumbs__item' + (isLast ? ' breadcrumbs__item--active' : '')}>
              {item.href ? (
                <Link className="breadcrumbs__link" to={item.href}>{item.label}</Link>
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
