from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .analyzer import analyze
from .paths import DEBUG_OUTPUT_DIR, DEFAULT_CONFIG
from .publish import publish_to_site, write_debug_output


def print_summary(stats: dict) -> None:
    g = stats["global"]
    sep = "-" * 52
    print(f"\n{'=' * 52}")
    print(f"  {stats['title']}")
    print(sep)
    print(f"  Páginas PDF          : {g.get('pdf_pages', g.get('pages'))}")
    print(f"  Páginas manuscrito   : {g.get('manuscript_pages', g.get('pages'))}")
    print(f"  Palabras             : {g['words']:,}".replace(",", "."))
    print(f"  Oraciones            : {g['sentences']:,}".replace(",", "."))
    print(f"  Párrafos             : {g['paragraphs']:,}".replace(",", "."))
    src = stats.get("chapters_source", "regex")
    print(f"  Partes / capítulos   : {g['chapters_detected']} ({src})")
    if g.get("chapters_reliable"):
        print("  División por páginas : manual (fiable)")
    print(sep)
    print(f"  Lectura silenciosa   : ~{g['reading_time_silent_min']} min")
    print(f"  Lectura en voz alta  : ~{g['reading_time_aloud_min']} min")
    print(sep)
    print(f"  Riqueza léxica (TTR) : {g['lexical_richness_ttr']:.4f}")
    print(f"  Ratio de diálogo     : {g['dialogue_ratio']:.2%}")
    print(f"  Prom. palabras/orac. : {g['avg_words_per_sentence']}")
    print(f"  Prom. palabras/pár.  : {g['avg_words_per_paragraph']}")

    ex = stats["extremes"]
    print(sep)
    if ex.get("longest_chapter"):
        lc = ex["longest_chapter"]
        print(f"  Cap. más largo       : «{lc['title'][:40]}» ({lc['words']:,} pal.)".replace(",", "."))
    if ex.get("shortest_chapter"):
        sc = ex["shortest_chapter"]
        print(f"  Cap. más corto       : «{sc['title'][:40]}» ({sc['words']:,} pal.)".replace(",", "."))
    print(f"  Párrafo más largo    : {ex['longest_paragraph_words']} palabras")
    print(f"  Oración más larga    : {ex['longest_sentence_words']} palabras")

    top3 = stats["characters"]["totals"][:5]
    if top3:
        print(sep)
        print("  Top 5 personajes:")
        for t in top3:
            bar = "█" * min(20, max(1, t["count"] // max(top3[0]["count"] // 20, 1)))
            print(f"    {t['label']:<22} {t['count']:>5}  {bar}")
    print(f"{'=' * 52}\n")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Analiza un manuscrito PDF y publica estadísticas en src/data/.",
    )
    parser.add_argument(
        "pdf",
        type=Path,
        help="Ruta al PDF del manuscrito",
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG,
        help=f"JSON de personajes y partes (default: {DEFAULT_CONFIG.name})",
    )
    parser.add_argument(
        "--keep-output",
        action="store_true",
        help="Guardar copia de depuración en scripts/manuscript_stats/output/stats.json",
    )
    args = parser.parse_args(argv)

    if not args.pdf.is_file():
        print(f"ERROR: PDF no encontrado: {args.pdf}", file=sys.stderr)
        return 1
    if not args.config.is_file():
        print(f"ERROR: Config no encontrada: {args.config}", file=sys.stderr)
        return 1

    try:
        with args.config.open(encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON de config inválido: {e}", file=sys.stderr)
        return 1

    print(f"\nAnalizando: {args.pdf.name}")
    try:
        stats = analyze(args.pdf, config)
    except Exception as e:
        print(f"ERROR durante el análisis: {e}", file=sys.stderr)
        return 1

    full_path, summary_path = publish_to_site(stats)
    print(f"  Stats completos  -> {full_path}")
    print(f"  Resumen global   -> {summary_path}")

    if args.keep_output:
        debug_path = write_debug_output(stats, DEBUG_OUTPUT_DIR)
        print(f"  Copia depuracion -> {debug_path}")

    print_summary(stats)
    return 0
