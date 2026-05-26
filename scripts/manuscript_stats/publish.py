from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .paths import MANUSCRIPT_STATS_JSON, SUMMARY_STATS_JSON

SUMMARY_KEYS = (
    "words",
    "characters_with_spaces",
    "characters_without_spaces",
    "lines",
    "sentences",
    "paragraphs",
    "reading_time_silent_min",
    "reading_time_aloud_min",
    "avg_words_per_sentence",
    "avg_words_per_paragraph",
    "lexical_richness_ttr",
    "dialogue_ratio",
    "pdf_pages",
    "manuscript_pages",
)


def publish_to_site(stats: dict[str, Any]) -> tuple[Path, Path]:
    """Escribe JSON completo y resumen global en src/data/."""
    MANUSCRIPT_STATS_JSON.parent.mkdir(parents=True, exist_ok=True)

    site = dict(stats)
    site.pop("source_pdf", None)

    with MANUSCRIPT_STATS_JSON.open("w", encoding="utf-8") as f:
        json.dump(site, f, ensure_ascii=False, indent=2)

    g = stats["global"]
    slim = {k: g[k] for k in SUMMARY_KEYS if k in g}
    slim["analyzed_at"] = stats["analyzed_at"]
    slim["lang"] = stats["lang"]

    with SUMMARY_STATS_JSON.open("w", encoding="utf-8") as f:
        json.dump(slim, f, ensure_ascii=False, indent=2)

    return MANUSCRIPT_STATS_JSON, SUMMARY_STATS_JSON


def write_debug_output(stats: dict[str, Any], out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    out_json = out_dir / "stats.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    return out_json
