# Análisis de manuscrito (PDF)

Script en Python para extraer texto de un PDF y generar estadísticas: palabras, capítulos, personajes más mencionados y gráficos.

## Requisitos

- Python 3.10+
- Dependencias:

```powershell
pip install -r scripts/manuscript-analysis/requirements.txt
```

## Uso básico

```powershell
cd c:\Users\ramir\Documents\authorsite

python scripts/manuscript-analysis/analyze_pdf.py `
  --pdf "C:\ruta\a\Necromancia a Medianoche.pdf" `
  --charts
```

## Salida

Por defecto en `scripts/manuscript-analysis/output/`:

| Archivo | Contenido |
|---------|-----------|
| `stats.json` | Métricas globales, por capítulo, menciones de personajes y vocabulario |
| `charts/character_mentions_pie.png` | Pastel de menciones totales |
| `charts/chapter_word_counts.png` | Palabras por capítulo detectado |
| `charts/character_by_chapter.png` | Mapa de calor personaje × capítulo |

## Opciones

| Flag | Descripción |
|------|-------------|
| `--pdf` | Ruta al PDF (obligatorio) |
| `--config` | JSON de personajes y patrones de capítulo (default: `config/necromancia-medianoche.json`) |
| `--out` | Carpeta de salida |
| `--charts` | Generar PNG con matplotlib |
| `--copy-to-src` | Actualiza `src/data/necromancia-a-medianoche-stats.json` con totales globales |
| `--copy-to-site` | Copia el JSON completo a `src/data/necromancia-manuscript-stats.json` (sección en la ficha del libro) |

## Configurar personajes y partes

Edita [`config/necromancia-medianoche.json`](config/necromancia-medianoche.json):

- **`parts`** (recomendado): lista de `{ "title", "page_start", "page_end" }` con **números de página del PDF (1-based, inclusive)**. Úsalo cuando los títulos de parte son imágenes y no salen en el texto extraído.
- **`chapter_patterns`**: expresiones regulares de respaldo si no defines `parts`.
- **`characters`**: lista con `id`, `label` y `aliases` (variantes del nombre en el texto). Los alias cortos (`Cassian`, `Lucia`) pueden inflar el conteo si aparecen solos con otro sentido; ajusta la lista según tu manuscrito.
- **`exclude_terms`**: términos a omitir del análisis de vocabulario (nombres propios recurrentes, títulos, etc.).
- **`trim_sparse_pages`** (default `true`): omite páginas casi vacías al inicio/fin de cada parte (portadas, blanks).
## Limitaciones del PDF

- El texto depende de cómo esté maquetado el PDF (escaneado vs digital). PDFs escaneados sin capa de texto necesitan OCR (no incluido).
- Si los títulos de parte son imágenes, define **`parts`** con los rangos de página; el regex no los verá.
- Si no hay `parts` ni coincidencias de regex, todo el libro se trata como un solo bloque.
- Las menciones son **conteo de cadenas**, no análisis semántico; revisa los totales antes de publicarlos en el códice.

## Sincronizar con el sitio

Tras revisar `stats.json`:

```powershell
python scripts/manuscript-analysis/analyze_pdf.py --pdf "tu-libro.pdf" --copy-to-site
# o, si ya generaste output/stats.json:
npm run sync-manuscript-stats
```

La ficha [`docs/CrSaSo/libros/Necromancia a Medianoche.mdx`](../../docs/CrSaSo/libros/Necromancia%20a%20Medianoche.mdx) muestra el bloque **Estadísticas del manuscrito** al final vía `BookManuscriptStats`.
