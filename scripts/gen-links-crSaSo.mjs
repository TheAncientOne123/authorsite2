import fs from 'fs';
import path from 'path';

const DOCS_ROOT = 'docs/CrSaSo';
const GRAPH_PATH = 'static/graphs/crSaSo.json';

const sections = {
  personajes: 'Personajes',
  eventos: 'Eventos',
  familias: 'Familias y organizaciones',
  lugares: 'Lugares',
  libros: 'Libros',
  'objetos-conceptos': 'Objetos y conceptos',
};

const order = ['personajes', 'eventos', 'familias', 'lugares', 'libros', 'objetos-conceptos'];

const graphCategoryOverrides = {
  'otros/Elemento 121': 'objetos-conceptos',
};

function scanDocs() {
  const byCat = {};
  if (!fs.existsSync(DOCS_ROOT)) return byCat;

  for (const cat of fs.readdirSync(DOCS_ROOT, { withFileTypes: true })) {
    if (!cat.isDirectory()) continue;
    const folder = cat.name;
    if (!sections[folder]) continue;

    const dir = path.join(DOCS_ROOT, folder);
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.mdx')) continue;
      const name = file.slice(0, -4);
      if (!byCat[folder]) byCat[folder] = [];
      byCat[folder].push({ name, label: name, source: 'docs' });
    }
  }
  return byCat;
}

function loadGraphLabels() {
  const data = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
  const labels = new Map();
  for (const n of data.nodes) {
    labels.set(n.id, n.label || n.id.split('/').pop());
  }
  return labels;
}

function mergeGraphInto(byCat, labels) {
  const data = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
  const docNames = new Set();
  for (const items of Object.values(byCat)) {
    for (const i of items) docNames.add(i.name);
  }

  for (const n of data.nodes) {
    const slash = n.id.indexOf('/');
    if (slash === -1) continue;
    let cat = n.id.slice(0, slash);
    const name = n.id.slice(slash + 1);

    const override = graphCategoryOverrides[n.id];
    if (override) cat = override;

    if (cat === 'otros') {
      if (docNames.has(name)) continue;
      cat = 'objetos-conceptos';
    }

    if (!sections[cat]) continue;

    const existing = byCat[cat] || [];
    if (existing.some((e) => e.name === name)) continue;

    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({
      name,
      label: labels.get(n.id) || name,
      source: 'graph',
    });
  }
}

function applyLabels(byCat, labels) {
  for (const items of Object.values(byCat)) {
    for (const item of items) {
      for (const [id, lbl] of labels) {
        if (id.endsWith('/' + item.name)) {
          item.label = lbl;
          break;
        }
      }
    }
  }
}

function sitePath(cat, name) {
  return `/CrSaSo/${cat}/${encodeURIComponent(name)}`;
}

function docPath(cat, name) {
  return `${DOCS_ROOT}/${cat}/${name}.mdx`.replace(/\\/g, '/');
}

function docusaurusLink(cat, name, label) {
  return `<Link to="${sitePath(cat, name)}">${label}</Link>`;
}

function markdownLink(label, href) {
  return `[${label}](${href})`;
}

const aliasRows = [
  ['Caso del Cuarto Rojo', 'eventos', 'El Cuarto Rojo', 'El Cuarto Rojo'],
  ['La Guerra de las Pizzas', 'eventos', 'La Semana Negra', 'La Semana Negra'],
  ['Anya', 'personajes', 'Anya Rudzki', 'Anya Rudzki'],
  ['Tamara (Angelina Pollard)', 'personajes', 'Tamara Dobrescu', 'Tamara Dobrescu'],
  ['Cecilia', 'personajes', 'Cecilia Amadeo', 'Cecilia Amadeo'],
  ['Grigori', 'personajes', 'Grigori Zaikov', 'Grigori Zaikov'],
  ['Ibrahim Ramazan', 'personajes', 'Ibrahim Ramazan Zaikov', 'Ibrahim Ramazan Zaikov'],
  ['The Italian Boot', 'lugares', 'Italian’s Boot', 'Italian’s Boot'],
  ['Maple Valley', 'lugares', 'maple Valley', 'maple Valley'],
  ['Los Voronin', 'familias', 'La Familia Voronin', 'La Familia Voronin'],
  ['Mafia Tornatore', 'familias', 'La Familia Tornatore', 'La Familia Tornatore'],
  ['Mafia Santorelli', 'familias', 'La Familia Santorelli', 'La Familia Santorelli'],
  ['Familia De Fazio', 'familias', 'Familia De Fazio', 'Familia De Fazio'],
  ['Familia Zaikov (Águilas del Nido)', 'familias', 'La Familia Zaikov', 'La Familia Zaikov'],
  [
    'Los Vinculados (Cazadores y Brujas)',
    'familias',
    'Los Vinculados',
    null,
    [
      ['familias', 'Los Vinculados', 'Los Vinculados'],
      ['familias', 'Cazadores', 'Cazadores'],
      ['familias', 'Brujas', 'Brujas'],
    ],
  ],
  ['La Cruz (Secta)', 'familias', 'La Cruz', 'La Cruz'],
  ['Departamento de Policía', 'lugares', 'La Comisaría de Nueva Ámsterdam', 'La Comisaría de Nueva Ámsterdam'],
  ['FBI', 'lugares', 'Buró Federal de Investigación', 'Buró Federal de Investigación'],
  ['Castillo de Nueva Ámsterdam', 'lugares', 'El Castillo de Nueva Ámsterdam', 'El Castillo de Nueva Ámsterdam'],
  ['Refinería McCarthy', 'lugares', 'La Refinería McCarthy', 'La Refinería McCarthy'],
  ['Balneario Rushmore', 'lugares', 'El Balneario Rushmore', 'El Balneario Rushmore'],
  ['Recetario de Brujas', 'objetos-conceptos', 'Recetario de las Brujas', 'Recetario de las Brujas'],
  ['Vínculo de Sangre', 'objetos-conceptos', 'Vinculo de Sangre', 'Vínculo de Sangre'],
  ['Reino de las Sombras', 'objetos-conceptos', 'Reino de las sombras', 'Reino de las sombras'],
  ['Elemento 121 (otros)', 'objetos-conceptos', 'Elemento 121', 'Elemento 121'],
];

function aliasCell(row, format) {
  const [, , , , multi] = row;
  if (multi) {
    return multi.map(([c, n, l]) => format(c, n, l)).join(' · ');
  }
  const [, cat, name, lbl] = row;
  return format(cat, name, lbl);
}

function writeDocusaurus(byCat) {
  let out = '# CrSaSo — enlaces para copiar en .mdx\n\n';
  out += '> Referencia personal. Mantener fuera de `docs/` para que Docusaurus no lo publique.\n\n';
  out += 'Versión NotebookLM (Markdown estándar): `_links-crSaSo-notebook.md`\n\n';
  out += '## Import (una vez por archivo .mdx)\n\n';
  out += '```mdx\nimport Link from \'@docusaurus/Link\';\n```\n\n';
  out += '## Plantilla\n\n';
  out += '```mdx\n<Link to="/CrSaSo/CARPETA/NOMBRE-CODIFICADO">Texto visible</Link>\n```\n\n';
  out += '---\n\n';
  out += '## Alias del manuscrito → enlace canónico\n\n';
  out += '| Nombre alternativo | Enlace canónico |\n';
  out += '|--------------------|-----------------|\n';

  for (const row of aliasRows) {
    const [alt] = row;
    out += `| ${alt} | ${aliasCell(row, docusaurusLink)} |\n`;
  }

  out += '\n---\n\n';

  for (const cat of order) {
    const items = (byCat[cat] || []).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!items.length) continue;
    out += `## ${sections[cat]}\n\n`;
    for (const { name, label } of items) {
      out += docusaurusLink(cat, name, label) + '\n';
    }
    out += '\n';
  }

  fs.writeFileSync('_links-crSaSo.md', out, 'utf8');
}

function writeNotebook(byCat) {
  let out = '# CrSaSo — índice de entidades (NotebookLM)\n\n';
  out += 'Documento en **Markdown convencional** para subir a NotebookLM o usar como contexto del manuscrito.\n\n';
  out += 'Cada entrada incluye:\n\n';
  out += '- **Nombre:** enlace al archivo fuente `.mdx` en el repositorio\n';
  out += '- **URL del códice:** ruta pública en el sitio Docusaurus\n';
  out += '- **Categoría:** carpeta bajo `docs/CrSaSo/`\n\n';
  out += 'Al redactar fichas para el sitio, el equivalente en MDX es:\n';
  out += '`import Link from \'@docusaurus/Link\'` y `<Link to="URL del códice">texto</Link>` (ver `_links-crSaSo.md`).\n\n';
  out += '---\n\n';
  out += '## Alias del manuscrito → ficha canónica\n\n';
  out += '| Nombre en manuscrito / Notebook | Ficha | URL del códice |\n';
  out += '|--------------------------------|-------|----------------|\n';

  for (const row of aliasRows) {
    const [alt] = row;
    const [, cat, name, lbl] = row.length === 5 ? [null, null, null, null] : row;
    if (row.length === 5) {
      const multi = row[4];
      const links = multi
        .map(([c, n, l]) => markdownLink(l, docPath(c, n)))
        .join(' · ');
      const urls = multi.map(([c, n]) => '`' + sitePath(c, n) + '`').join(' · ');
      out += `| ${alt} | ${links} | ${urls} |\n`;
    } else {
      out += `| ${alt} | ${markdownLink(lbl, docPath(cat, name))} | \`${sitePath(cat, name)}\` |\n`;
    }
  }

  out += '\n---\n\n';

  for (const cat of order) {
    const items = (byCat[cat] || []).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!items.length) continue;
    out += `## ${sections[cat]}\n\n`;
    out += '| Nombre | Archivo | URL del códice |\n';
    out += '|--------|---------|----------------|\n';
    for (const { name, label } of items) {
      const file = docPath(cat, name);
      const exists = fs.existsSync(file);
      const fileCell = exists
        ? markdownLink(label, file)
        : `${label} (\`${file}\` — pendiente)`;
      out += `| ${label} | ${fileCell} | \`${sitePath(cat, name)}\` |\n`;
    }
    out += '\n';
  }

  out += '---\n\n';
  out += '## Listado rápido (solo enlaces a archivo)\n\n';

  for (const cat of order) {
    const items = (byCat[cat] || []).sort((a, b) => a.name.localeCompare(b.name, 'es'));
    if (!items.length) continue;
    out += `### ${sections[cat]}\n\n`;
    for (const { name, label } of items) {
      const file = docPath(cat, name);
      out += `- ${markdownLink(label, file)}\n`;
    }
    out += '\n';
  }

  fs.writeFileSync('_links-crSaSo-notebook.md', out, 'utf8');
}

const byCat = scanDocs();
const labels = loadGraphLabels();
mergeGraphInto(byCat, labels);
applyLabels(byCat, labels);

writeDocusaurus(byCat);
writeNotebook(byCat);

console.log('Wrote _links-crSaSo.md and _links-crSaSo-notebook.md');
