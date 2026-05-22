import React from 'react';
import Link from '@docusaurus/Link';
import {useLocation} from '@docusaurus/router';
import {useBaseUrlUtils} from '@docusaurus/useBaseUrl';

const UNIVERSE_SELECTOR = '/universes';

/** @type {{ path: string; label: string }[]} */
const DOC_UNIVERSES = [
  {path: '/CrSaSo', label: 'Crónicas de Sangre y Sombra'},
  {path: '/Meridian', label: 'Meridian'},
  {path: '/orbe', label: 'El Orbe de los Destinos'},
];

const LABELS = {
  bestiario: 'Bestiario',
  campañas: 'Campañas',
  clases: 'Clases',
  eventos: 'Eventos',
  facciones: 'Facciones',
  familias: 'Familias y Organizaciones',
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

export default function DocBreadcrumbs() {
  const {withBaseUrl} = useBaseUrlUtils();
  const location = useLocation();

  let docsBasePath = '';
  let universeLabel = '';
  let resolvedBase = '';

  for (const u of DOC_UNIVERSES) {
    const base = withBaseUrl(u.path);
    if (isUnderDocsBase(location.pathname, base)) {
      docsBasePath = u.path;
      universeLabel = u.label;
      resolvedBase = base;
      break;
    }
  }

  if (!resolvedBase) {
    return null;
  }

  // CrSaSo: breadcrumbs desactivados (portada y fichas del universo).
  if (docsBasePath === '/CrSaSo') {
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
  const categoryLabel = categorySlug ? LABELS[categorySlug] || prettify(categorySlug) : null;
  const categoryHref = categorySlug ? withBaseUrl(`${docsBasePath}/${categorySlug}`) : null;

  const fromCrSaSoGraph =
    docsBasePath === '/CrSaSo' &&
    (location.state?.fromCrSaSoGraph === true ||
      (typeof window !== 'undefined' &&
        window.sessionStorage?.getItem('crSaSoFromGraph') === '1'));

  const items = [
    {label: 'Inicio', href: withBaseUrl('/')},
    {label: 'Universos', href: withBaseUrl(UNIVERSE_SELECTOR)},
  ];

  if (fromCrSaSoGraph) {
    items.push({
      label: 'Grafo de relaciones',
      href: withBaseUrl('/grafos/sangre-y-sombra'),
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
