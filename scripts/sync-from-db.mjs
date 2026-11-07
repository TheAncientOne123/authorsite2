// Sincroniza El Códice con la base de datos del admin (Códice Admin / Supabase).
//
//   node scripts/sync-from-db.mjs                         (usa SUPABASE_URL + SUPABASE_ANON_KEY)
//   node scripts/sync-from-db.mjs --from-file snap.json   (instantánea local, sin red)
//   opciones: --docs-dir <carpeta>  (por defecto docs/)
//
// Genera:
//   docs/<universo>/**.mdx                 artículos publicados (MDX final renderizado por el admin)
//   src/generated/codice-data.json         universos, sidebars, libros, timeline, portada
//   src/generated/sidebars/<plugin>.js     sidebars de Docusaurus
//   static/graphs/<ruta>.json              grafos activados (desde los enlaces entre artículos)
//
// Solo lee lo publicado: con la clave anónima, RLS no deja ver borradores.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const fromFile = arg('--from-file');
const docsRoot = path.resolve(root, arg('--docs-dir') ?? 'docs');
const genDir = path.join(root, 'src', 'generated');
const graphsDir = path.join(root, 'static', 'graphs');

// ─────────────────────────── Lectura ───────────────────────────

async function fetchAll(base, key, table, query) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${base}/rest/v1/${table}?${query}`, {
      headers: {apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items'},
    });
    if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function loadFromDb() {
  const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) throw new Error('Faltan SUPABASE_URL y SUPABASE_ANON_KEY (o usa --from-file).');
  const q = (t, s = 'select=*') => fetchAll(base, key, t, s);
  const [universes, categories, articles, links, sidebar, books, graphs, lanes, entries, settings] = await Promise.all([
    q('universes', 'select=*&order=sort_order'),
    q('categories', 'select=*&order=sort_order'),
    q('articles', 'select=id,universe_id,category_id,slug,status,published&status=eq.publicado'),
    q('article_links', 'select=from_id,to_id&scope=eq.published'),
    q('sidebar_items', 'select=*&order=sort_order'),
    q('books', 'select=*&order=sort_order'),
    q('graph_configs', 'select=*&enabled=eq.true'),
    q('timeline_lanes', 'select=*&order=sort_order'),
    q('timeline_entries', 'select=*&order=sort_order'),
    q('site_settings', 'select=data'),
  ]);
  return {universes, categories, articles, links, sidebar, books, graphs, lanes, entries, settings: settings[0]?.data ?? {}};
}

function loadFromFile(file) {
  const s = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
  const visible = new Set(s.universes.filter((u) => u.visibility !== 'oculto').map((u) => u.id));
  const published = s.articles.filter((a) => a.status === 'publicado' && visible.has(a.universe_id));
  const pubIds = new Set(published.map((a) => a.id));
  return {
    universes: s.universes.filter((u) => visible.has(u.id)).sort((a, b) => a.sort_order - b.sort_order),
    categories: s.categories.filter((c) => visible.has(c.universe_id)),
    articles: published,
    links: s.article_links.filter((l) => l.scope === 'published' && pubIds.has(l.from_id) && pubIds.has(l.to_id)),
    sidebar: s.sidebar_items.filter((i) => visible.has(i.universe_id)).sort((a, b) => a.sort_order - b.sort_order),
    books: [...s.books].sort((a, b) => a.sort_order - b.sort_order),
    graphs: s.graph_configs.filter((g) => g.enabled),
    lanes: [...s.timeline_lanes].sort((a, b) => a.sort_order - b.sort_order),
    entries: [...s.timeline_entries].sort((a, b) => a.sort_order - b.sort_order),
    settings: s.site_settings ?? {},
  };
}

// ─────────────────────────── Utilidades ───────────────────────────

/** Ruta pública (sin baseUrl), con las reglas de Docusaurus. Igual que codice-admin/src/lib/content/paths.ts. */
function routeOf(a, u, cat) {
  const base = `/${u.route_base}`;
  const fm = a.published?.frontmatter ?? {};
  if (typeof fm.slug === 'string') {
    if (fm.slug.startsWith('/')) return fm.slug === '/' ? base : `${base}${fm.slug.replace(/\/$/, '')}`;
    return [base, cat?.slug, fm.slug].filter(Boolean).join('/');
  }
  const parts = [cat?.slug, a.slug === 'index' ? null : a.slug].filter(Boolean);
  return parts.length ? `${base}/${parts.join('/')}` : base;
}

/** Id de documento dentro del plugin (para sidebars y FeaturedArticle). */
function docIdOf(a, cat) {
  const fmId = a.published?.frontmatter?.id;
  return [cat?.slug, typeof fmId === 'string' ? fmId : a.slug].filter(Boolean).join('/');
}

function excerptOf(p) {
  if (p.description) return String(p.description).slice(0, 600);
  const para = p.body
    .split(/\n\s*\n/)
    .map((x) => x.trim())
    .find((x) => x && !x.startsWith('#') && !x.startsWith('<') && !x.startsWith('{') && !x.startsWith('import '));
  if (!para) return '';
  return para
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[*_`#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);
}

function imageOf(p) {
  const box = p.infobox;
  const img = box?.images?.[0] ?? box?.image;
  if (img?.src) return {image: img.src, imageAlt: img.alt || p.title};
  if (typeof p.frontmatter?.image === 'string') return {image: p.frontmatter.image, imageAlt: p.title};
  return {};
}

/** Igual que codice-admin/src/lib/content/graph.ts (buildGraph). */
function groupOf(a, cfg) {
  return cfg.groups.find((g) => g.articles.includes(a.id)) ?? cfg.groups.find((g) => a.categorySlug && g.categories.includes(a.categorySlug)) ?? null;
}

function write(file, content) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, content);
}

// ─────────────────────────── Generación ───────────────────────────

async function main() {
  const d = fromFile ? loadFromFile(fromFile) : await loadFromDb();
  const uById = new Map(d.universes.map((u) => [u.id, u]));
  const cById = new Map(d.categories.map((c) => [c.id, c]));
  const aById = new Map(d.articles.map((a) => [a.id, a]));

  // 1) Artículos → docs/
  for (const u of d.universes) fs.rmSync(path.join(docsRoot, u.docs_dir), {recursive: true, force: true});
  let written = 0;
  for (const a of d.articles) {
    if (!uById.has(a.universe_id) || !a.published?.mdx) continue;
    write(path.join(docsRoot, a.published.path), a.published.mdx);
    written++;
  }

  // 2) Grafos
  fs.mkdirSync(graphsDir, {recursive: true});
  const graphByUniverse = new Map();
  const bookList = d.books.map((b) => ({key: b.key, label: b.label, color: b.color}));
  for (const cfg of d.graphs) {
    const u = uById.get(cfg.universe_id);
    if (!u) continue;
    const excluded = new Set(cfg.excluded_article_ids ?? []);
    const members = d.articles.filter((a) => a.universe_id === u.id && !excluded.has(a.id));
    const ids = new Set(members.map((a) => a.id));
    const seen = new Set();
    const edges = [];
    const degree = new Map();
    for (const l of d.links) {
      if (!ids.has(l.from_id) || !ids.has(l.to_id) || l.from_id === l.to_id) continue;
      const k = l.from_id < l.to_id ? `${l.from_id}|${l.to_id}` : `${l.to_id}|${l.from_id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      edges.push({source: l.from_id, target: l.to_id});
      degree.set(l.from_id, (degree.get(l.from_id) ?? 0) + 1);
      degree.set(l.to_id, (degree.get(l.to_id) ?? 0) + 1);
    }
    const nodes = members.map((a) => {
      const cat = a.category_id ? cById.get(a.category_id) : null;
      const g = groupOf({id: a.id, categorySlug: cat?.slug ?? null}, cfg);
      const p = a.published;
      return {
        id: a.id,
        docId: docIdOf(a, cat),
        label: p.title,
        group: g?.id ?? 'otros',
        libro: typeof p.frontmatter?.libro === 'string' ? p.frontmatter.libro : null,
        route: routeOf(a, u, cat),
        degree: degree.get(a.id) ?? 0,
        excerpt: excerptOf(p),
        ...imageOf(p),
      };
    });
    const legend = [
      ...cfg.groups.map((g) => ({key: g.id, label: g.label, color: g.color})),
      {key: 'otros', label: cfg.other_label, color: cfg.other_color},
    ];
    const json = {
      generatedAt: new Date().toISOString(),
      universe: u.route_base,
      title: cfg.title || 'Grafo de relaciones',
      legend,
      books: bookList.filter((b) => nodes.some((n) => n.libro === b.key)),
      filters: cfg.filters ?? {},
      settings: cfg.settings ?? {},
      nodes,
      edges,
    };
    write(path.join(graphsDir, `${cfg.route_slug}.json`), JSON.stringify(json));
    graphByUniverse.set(u.id, {routeSlug: cfg.route_slug, title: json.title, jsonPath: `/graphs/${cfg.route_slug}.json`});
  }

  // 3) Sidebars
  const sidebars = {};
  for (const u of d.universes) {
    const items = [];
    for (const it of d.sidebar.filter((x) => x.universe_id === u.id)) {
      if (it.kind === 'articulo') {
        const a = aById.get(it.article_id);
        if (!a) continue; // no publicado
        const cat = a.category_id ? cById.get(a.category_id) : null;
        items.push({type: 'doc', id: docIdOf(a, cat), ...(it.label ? {label: it.label} : {})});
      } else if (it.kind === 'grafo') {
        const g = graphByUniverse.get(u.id);
        if (g) items.push({type: 'link', label: it.label || g.title, href: `/grafos/${g.routeSlug}`, className: 'sidebarGraphLink'});
      } else if (it.href) {
        items.push({type: 'link', label: it.label || it.href, href: it.href});
      }
    }
    // Docusaurus exige al menos un elemento: el índice del universo si el sidebar quedó vacío.
    if (!items.length) {
      const idx = d.articles.find((a) => a.universe_id === u.id && !a.category_id && (a.slug === 'index' || a.published?.frontmatter?.slug === '/'));
      if (idx) items.push({type: 'doc', id: docIdOf(idx, null), label: u.label});
    }
    sidebars[u.plugin_id] = items;
    write(
      path.join(genDir, 'sidebars', `${u.plugin_id}.js`),
      `// Generado por scripts/sync-from-db.mjs — no editar.\nmodule.exports = ${JSON.stringify({[`${u.plugin_id}Sidebar`]: items}, null, 2)};\n`,
    );
  }

  // 4) Datos globales
  const routeOfArticleId = (id) => {
    const a = id ? aById.get(id) : null;
    if (!a) return null;
    return routeOf(a, uById.get(a.universe_id), a.category_id ? cById.get(a.category_id) : null);
  };
  const data = {
    generatedAt: new Date().toISOString(),
    source: fromFile ? 'archivo' : 'supabase',
    site: d.settings,
    universes: d.universes.map((u) => ({
      id: u.id,
      routeBase: u.route_base,
      pluginId: u.plugin_id,
      docsDir: u.docs_dir,
      label: u.label,
      description: u.description,
      cover: u.cover_image,
      themeId: u.theme_id,
      visibility: u.visibility,
      categories: d.categories.filter((c) => c.universe_id === u.id).map((c) => ({slug: c.slug, label: c.label})),
      graph: graphByUniverse.get(u.id) ?? null,
    })),
    books: d.books.map((b) => ({
      key: b.key,
      label: b.label,
      color: b.color,
      order: b.sort_order,
      published: b.published,
      universe: uById.get(b.universe_id)?.route_base ?? null,
      docRoute: routeOfArticleId(b.article_id),
      cover: b.cover,
      tagline: b.tagline,
      year: b.year,
      synopsis: b.synopsis,
      buyUrl: b.buy_url,
      inStore: b.in_store,
    })),
    timeline: {
      lanes: d.lanes.map((l) => ({id: l.id, label: l.label, color: l.color, ...(l.href ? {href: l.href} : {})})),
      entries: d.entries.map((e) => ({
        id: e.id,
        lane: e.lane_id,
        kind: e.kind,
        title: e.title,
        start: e.start_date,
        ...(e.kind !== 'publicacion' ? {end: e.ongoing ? null : e.end_date ?? undefined} : {}),
        ...(e.approx ? {approx: true} : {}),
        ...(e.description ? {description: e.description} : {}),
        ...(e.href ? {href: e.href} : {}),
        ...(e.cover ? {cover: e.cover} : {}),
      })),
    },
  };
  write(path.join(genDir, 'codice-data.json'), JSON.stringify(data, null, 2));

  console.log(
    `[sync-from-db] ${written} artículos · ${d.universes.length} universos · ${graphByUniverse.size} grafo(s) · ` +
      `${d.books.length} libros · ${d.entries.length} entradas de timeline (${data.source})`,
  );
}

main().catch((e) => {
  console.error(`[sync-from-db] ${e.message ?? e}`);
  process.exit(1);
});
