# Estadísticas del manuscrito

Analiza un PDF y publica métricas en `src/data/` para los gráficos React de la ficha del libro.

## Requisitos

- Python 3.10+
- PyMuPDF:

```powershell
pip install -r scripts/manuscript_stats/requirements.txt
```

## Uso

```powershell
npm run manuscript-stats -- "C:\ruta\Necromancia a Medianoche.pdf"
```

Equivalente directo:

```powershell
python scripts/manuscript_stats/__main__.py "C:\ruta\Necromancia a Medianoche.pdf"
```

El comando:

1. Lee el PDF con los rangos de [`config/necromancia-medianoche.json`](config/necromancia-medianoche.json)
2. Publica en `src/data/necromancia-manuscript-stats.json` (completo)
3. Publica en `src/data/necromancia-a-medianoche-stats.json` (resumen global)

Recarga `npm start` para ver los charts en la ficha de *Necromancia a Medianoche*.

## Rangos de página

Los valores `page_start` / `page_end` en `parts` son **números de página del PDF** (1-based, inclusive).

- Páginas 1–6: numeración editorial (portada, créditos, etc.), **excluidas** del manuscrito.
- Páginas 7–465: contenido analizado (prólogo, 9 partes, epílogo).
- Páginas posteriores (p. ej. agradecimientos): fuera del análisis.

`trim_sparse_pages` está en `false` por defecto: se respetan los rangos configurados tal cual.

## Opciones

| Flag | Descripción |
|------|-------------|
| `--config` | JSON alternativo (default: `config/necromancia-medianoche.json`) |
| `--keep-output` | Copia de depuración en `scripts/manuscript_stats/output/stats.json` |

## Gráficos

Los charts del sitio usan Recharts (`BookManuscriptStatsCharts`) leyendo el JSON publicado. No se generan PNG en Python.

## Editar personajes y partes

- **`parts`**: título y rango de páginas del PDF por sección.
- **`characters`**: `id`, `label`, `aliases` para conteo de menciones.
- **`exclude_terms`**: términos omitidos del análisis de vocabulario.
