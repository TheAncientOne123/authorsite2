import type {TocHeading} from './extraDocToc';

/** Extrae los encabezados útiles de un TOC de doc embebido (omite el h1 de título). */
export function embeddableDocToc(raw: TocHeading[]): TocHeading[] {
  if (raw.length === 1 && raw[0].level === 1 && raw[0].children?.length) {
    return raw[0].children;
  }
  return raw.filter((h) => h.level > 1);
}

/** Convierte encabezados planos del DOM en árbol anidado. */
export function treeifyHeadings(
  flat: Array<{value: string; id: string; level: number}>,
): TocHeading[] {
  const root: TocHeading[] = [];
  const stack: Array<{level: number; children: TocHeading[]}> = [{level: 0, children: root}];

  for (const h of flat) {
    const item: TocHeading = {value: h.value, id: h.id, level: h.level, children: []};
    while (stack.length > 1 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    stack[stack.length - 1].children.push(item);
    stack.push({level: h.level, children: item.children!});
  }

  return root;
}

/** Lee h2–h4 con id desde un contenedor renderizado. */
export function scrapeHeadingsFrom(container: HTMLElement): TocHeading[] {
  const nodes = container.querySelectorAll('h2, h3, h4');
  const flat = Array.from(nodes)
    .filter((el) => el.id)
    .map((el) => ({
      value: (el.textContent ?? '').trim(),
      id: el.id,
      level: Number.parseInt(el.tagName[1], 10),
    }))
    .filter((h) => h.value);
  return treeifyHeadings(flat);
}

export function buildFeaturedArticleToc(
  docChildren: TocHeading[],
): TocHeading[] {
  return [
    {
      value: 'Artículo destacado',
      id: 'featured-article-heading',
      level: 2,
      children: docChildren,
    },
  ];
}
