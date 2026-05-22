#!/usr/bin/env python3
"""
analyze_pdf.py  ·  v2.0
Analiza un manuscrito en PDF: estadísticas globales, por capítulo,
menciones de personajes y gráficos.

Uso:
  pip install pymupdf matplotlib numpy
  python analyze_pdf.py --pdf libro.pdf --config necromancia-medianoche.json --charts

Salida (por defecto en ./output/):
  stats.json
  charts/character_mentions_pie.png
  charts/chapter_word_counts.png
  charts/character_by_chapter.png
  charts/top_words_bar.png          ← nuevo
  charts/sentences_per_chapter.png  ← nuevo
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ── Dependencias obligatorias ──────────────────────────────────────────────────
try:
    import fitz  # PyMuPDF
except ImportError:
    sys.exit(
        "PyMuPDF no encontrado.\n"
        "Instala dependencias: pip install pymupdf matplotlib numpy"
    )

# ── Rutas por defecto (relativas al script) ────────────────────────────────────
SCRIPT_DIR = Path(__file__).resolve().parent
DEFAULT_CONFIG = SCRIPT_DIR / "config" / "necromancia-medianoche.json"
DEFAULT_OUT = SCRIPT_DIR / "output"

# ── Velocidades de lectura (palabras por minuto) ───────────────────────────────
WPM_SILENT = 250   # lectura silenciosa adulto promedio
WPM_ALOUD  = 130   # lectura en voz alta / audiolibro

# ── Stopwords español — ampliadas ─────────────────────────────────────────────
STOPWORDS_ES: set[str] = {
    # artículos y determinantes
    "el", "la", "los", "las", "un", "una", "unos", "unas",
    # preposiciones
    "a", "al", "ante", "bajo", "con", "contra", "de", "del", "desde",
    "durante", "en", "entre", "hacia", "hasta", "mediante", "para",
    "por", "según", "sin", "sobre", "tras",
    # conjunciones
    "e", "ni", "o", "u", "pero", "sino", "aunque", "porque", "pues",
    "que", "qué", "como", "cuando", "donde", "si", "ya",
    # pronombres
    "yo", "tú", "tu", "él", "ella", "ello", "nosotros", "vosotros",
    "ellos", "ellas", "me", "te", "se", "nos", "os", "le", "les",
    "lo", "la", "mi", "ti", "su", "sus", "mis", "tus",
    "cual", "cuales", "quien", "quienes",
    # demostrativos / posesivos
    "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
    "aquel", "aquella", "aquellos", "aquellas", "esto", "eso", "aquello",
    "nuestro", "nuestra", "nuestros", "nuestras",
    # verbos auxiliares muy frecuentes
    "ser", "es", "era", "son", "fue", "sido", "siendo",
    "estar", "estoy", "estás", "está", "estaba", "estaban", "estuvo",
    "estamos", "están", "estado", "estados", "estaban",
    "haber", "ha", "han", "he", "hemos", "había", "habia", "hubo",
    "tener", "tiene", "tienen", "tenía", "tenia", "tuvo",
    "hacer", "hace", "hacía", "hizo", "hecho",
    "ir", "iba", "fue", "van", "vamos", "irse",
    "poder", "puede", "podía", "pudo",
    "deber", "debe", "debía",
    "querer", "quiere", "quería",
    "decir", "dijo", "dice", "dijo", "dicho",
    # adverbios genéricos
    "no", "sí", "si", "ya", "muy", "más", "mas", "tan", "tanto",
    "también", "tampoco", "bien", "mal", "antes", "después", "ahora",
    "siempre", "nunca", "jamás", "solo", "solamente", "además",
    "aquí", "allí", "allá", "donde", "adonde",
    # cuantificadores
    "todo", "todos", "toda", "todas", "nada", "algo", "alguien",
    "nadie", "poco", "mucho", "otro", "otros", "otra", "otras",
    "algunos", "algunas", "algún", "alguna", "ningún", "ninguna",
    "dos", "tres", "primero", "segunda",
    # miscelánea muy frecuente en narrativa
    "hay", "así", "pues", "entonces", "vez", "veces", "cada",
    "mismo", "misma", "mismos", "mismas",
    # formas con tilde — duplicados normalizados
    "él", "tú", "sí", "qué", "cómo", "cuándo", "dónde",
    "aún", "más", "ésa", "ésas", "ése", "ésos", "ésta", "éstas",
    "éste", "éstos",
}


# ══════════════════════════════════════════════════════════════════════════════
# Modelo de datos
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class Chapter:
    index: int
    title: str
    text: str
    page_start: int = 0   # 1-based, inclusive (solo con parts en config)
    page_end: int = 0     # 1-based, inclusive

    @property
    def word_count(self) -> int:
        return len(re.findall(r"\b\w+\b", self.text, flags=re.UNICODE))


# ══════════════════════════════════════════════════════════════════════════════
# Extracción de texto
# ══════════════════════════════════════════════════════════════════════════════

def _extract_page_text(page: fitz.Page) -> str:
    """Texto de una página, bloques ordenados por lectura."""
    blocks = page.get_text("blocks")
    blocks.sort(key=lambda b: (round(b[1] / 10), b[0]))
    lines = [b[4].strip() for b in blocks if b[4].strip()]
    return "\n".join(lines)


def _clean_text(text: str) -> str:
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    text = re.sub(r"(?m)^\s*\d{1,4}\s*$", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_pages_from_pdf(pdf_path: Path) -> tuple[list[str], int]:
    """Devuelve (texto_por_página, número_de_páginas). Índice 0 = página 1."""
    doc = fitz.open(str(pdf_path))
    pages = [_clean_text(_extract_page_text(page)) for page in doc]
    n_pages = doc.page_count
    doc.close()
    return pages, n_pages


def extract_text_from_pdf(pdf_path: Path) -> tuple[str, int]:
    """Devuelve (texto_completo, número_de_páginas)."""
    page_texts, n_pages = extract_pages_from_pdf(pdf_path)
    text = "\f".join(page_texts)
    return _clean_text(text), n_pages


# ══════════════════════════════════════════════════════════════════════════════
# Detección de capítulos
# ══════════════════════════════════════════════════════════════════════════════

_NOISE_TITLE_RE = re.compile(
    r"^\s*(\d{1,4}|[IVXivx]{1,6}|[•·\-–—*]+)\s*$"
)


def _clean_title(raw: str, fallback: str) -> str:
    """Normaliza el título de un capítulo extraído del encabezado."""
    title = raw.strip().replace("\n", " ")
    title = re.sub(r"\s{2,}", " ", title)[:140]
    if _NOISE_TITLE_RE.match(title):
        return fallback
    return title or fallback


def split_chapters(text: str, patterns: list[str]) -> list[Chapter]:
    """
    Divide el texto en capítulos según los patrones de la config.
    Si no hay patrones o no hay coincidencias, devuelve un único bloque.
    """
    if not patterns:
        return [Chapter(0, "Documento completo", text)]

    combined = "|".join(f"(?:{p})" for p in patterns)
    regex = re.compile(combined, re.MULTILINE | re.IGNORECASE)

    matches = list(regex.finditer(text))
    if not matches:
        return [Chapter(0, "Documento completo", text)]

    chapters: list[Chapter] = []

    # Texto anterior al primer capítulo (prólogo implícito, portada…)
    pre = text[: matches[0].start()].strip()
    if pre and len(pre.split()) > 30:
        chapters.append(Chapter(0, "Introducción / Portada", pre))

    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)

        # Extraer línea de encabezado completa (hasta 200 chars o salto de línea)
        nl_pos = text.find("\n", start)
        if nl_pos == -1 or nl_pos - start > 200:
            nl_pos = start + 200
        raw_heading = text[start:nl_pos]
        title = _clean_title(raw_heading, f"Sección {i + 1}")

        body = text[start:end].strip()
        chapters.append(Chapter(len(chapters), title, body))

    return chapters


def split_chapters_by_parts(
    page_texts: list[str],
    parts: list[dict[str, Any]],
    n_pages: int,
) -> list[Chapter]:
    """
    Divide el manuscrito por rangos de página (1-based, inclusive).
    Los títulos de parte en imagen no aparecen en el texto extraído.
    """
    chapters: list[Chapter] = []
    for i, part in enumerate(parts):
        title = str(part.get("title", f"Parte {i + 1}")).strip()
        try:
            ps = int(part["page_start"])
            pe = int(part["page_end"])
        except (KeyError, TypeError, ValueError) as e:
            raise ValueError(f"Parte «{title}»: page_start y page_end son obligatorios") from e
        if ps < 1 or pe < ps:
            raise ValueError(f"Parte «{title}»: rango inválido {ps}-{pe}")
        if ps > n_pages:
            print(
                f"  AVISO: «{title}» empieza en pág {ps} pero el PDF tiene {n_pages} páginas",
                file=sys.stderr,
            )
            continue
        pe_clamped = min(pe, n_pages)
        if pe_clamped < pe:
            print(
                f"  AVISO: «{title}» termina en pág {pe} pero el PDF tiene {n_pages}; "
                f"usando hasta pág {pe_clamped}",
                file=sys.stderr,
            )
        body = "\n\n".join(page_texts[ps - 1 : pe_clamped]).strip()
        chapters.append(Chapter(i, title, body, page_start=ps, page_end=pe_clamped))
    if not chapters:
        raise ValueError("Ninguna parte pudo mapearse a páginas del PDF")
    return chapters


# ══════════════════════════════════════════════════════════════════════════════
# Métricas de texto
# ══════════════════════════════════════════════════════════════════════════════

def count_words(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text, flags=re.UNICODE))


# Separa por punto, !, ?, … o salto de línea doble (para texto narrativo)
_SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+|(?<=\n)\n")

def count_sentences(text: str) -> int:
    parts = _SENT_SPLIT.split(text)
    return sum(1 for p in parts if p.strip() and len(p.strip()) > 3)


def count_paragraphs(text: str) -> int:
    return sum(1 for p in re.split(r"\n\s*\n", text) if p.strip())


def avg_sentence_length(text: str) -> float:
    """Palabras promedio por oración."""
    sents = _SENT_SPLIT.split(text)
    sents = [s.strip() for s in sents if s.strip() and len(s.strip()) > 3]
    if not sents:
        return 0.0
    return round(sum(count_words(s) for s in sents) / len(sents), 1)


def avg_paragraph_length(text: str) -> float:
    """Palabras promedio por párrafo."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paras:
        return 0.0
    return round(sum(count_words(p) for p in paras) / len(paras), 1)


def lexical_richness(text: str) -> float:
    """Type-Token Ratio (TTR): vocabulario único / total tokens."""
    tokens = re.findall(r"\b[\wáéíóúñüÁÉÍÓÚÑÜ]+\b", text.lower(), flags=re.UNICODE)
    if not tokens:
        return 0.0
    return round(len(set(tokens)) / len(tokens), 4)


def dialogue_ratio(text: str) -> float:
    """Fracción aproximada de texto que es diálogo (líneas con —, «» o "")."""
    lines = text.splitlines()
    total = sum(len(l) for l in lines if l.strip())
    dialogue = sum(
        len(l) for l in lines
        if re.match(r"^\s*(—|«|\"|\")", l)
    )
    return round(dialogue / max(total, 1), 4)


def longest_paragraph(text: str) -> tuple[int, str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paras:
        return 0, ""
    best = max(paras, key=count_words)
    preview = best[:300] + ("…" if len(best) > 300 else "")
    return count_words(best), preview


def longest_sentence(text: str) -> tuple[int, str]:
    sents = [s.strip() for s in _SENT_SPLIT.split(text) if s.strip()]
    if not sents:
        return 0, ""
    best = max(sents, key=count_words)
    preview = best[:300] + ("…" if len(best) > 300 else "")
    return count_words(best), preview


def shortest_chapter(chapters: list[Chapter]) -> dict | None:
    if not chapters:
        return None
    ch = min(chapters, key=lambda c: c.word_count)
    return {"index": ch.index, "title": ch.title, "words": ch.word_count}


# ══════════════════════════════════════════════════════════════════════════════
# Personajes
# ══════════════════════════════════════════════════════════════════════════════

def build_character_pattern(aliases: list[str]) -> re.Pattern:
    """
    Construye una regex para todos los alias del personaje.
    Alias más largos primero para priorizar coincidencias completas.
    Usa word boundaries Unicode para no capturar subcadenas.
    """
    unique = sorted(
        {a.strip() for a in aliases if a.strip()},
        key=len,
        reverse=True,
    )
    inner = "|".join(re.escape(a) for a in unique)
    # \b no funciona bien con tildes en Python; usamos lookbehind/lookahead manual
    return re.compile(
        rf"(?<![A-Za-záéíóúñüÀ-ÿ])(?:{inner})(?![A-Za-záéíóúñüÀ-ÿ])",
        re.IGNORECASE | re.UNICODE,
    )


def count_mentions(text: str, pattern: re.Pattern) -> int:
    return len(pattern.findall(text))


def first_appearance(text: str, pattern: re.Pattern) -> int:
    """Posición (en palabras) de la primera mención del personaje."""
    m = pattern.search(text)
    if not m:
        return -1
    return count_words(text[: m.start()])


# ══════════════════════════════════════════════════════════════════════════════
# Vocabulario
# ══════════════════════════════════════════════════════════════════════════════

def _normalize(word: str) -> str:
    """Normaliza tildes para el conteo de frecuencias."""
    replacements = str.maketrans("áéíóúü", "aeiouu")
    return word.lower().translate(replacements)


def top_tokens(text: str, extra_stop: set[str], n: int = 40) -> list[dict]:
    tokens = re.findall(r"\b[\wáéíóúñüÁÉÍÓÚÑÜ]+\b", text, flags=re.UNICODE)
    stop = STOPWORDS_ES | extra_stop
    filtered = [
        _normalize(t)
        for t in tokens
        if len(t) > 2
        and _normalize(t) not in stop
        and not t.isdigit()
    ]
    counter = Counter(filtered)
    return [{"word": w, "count": c} for w, c in counter.most_common(n)]


# ══════════════════════════════════════════════════════════════════════════════
# Análisis principal
# ══════════════════════════════════════════════════════════════════════════════

def analyze(pdf_path: Path, config: dict) -> dict:
    print(f"  Extrayendo texto de '{pdf_path.name}'…")
    page_texts, n_pages = extract_pages_from_pdf(pdf_path)
    raw = "\f".join(page_texts)
    raw = _clean_text(raw)

    if not raw:
        raise ValueError("No se pudo extraer texto del PDF. ¿Está escaneado sin OCR?")

    parts_cfg: list[dict] = config.get("parts") or []
    if parts_cfg:
        chapters = split_chapters_by_parts(page_texts, parts_cfg, n_pages)
        chapters_source = "manual_pages"
        print(f"  Partes por páginas (config): {len(chapters)}")
    else:
        patterns: list[str] = config.get("chapter_patterns", [])
        chapters = split_chapters(raw, patterns)
        chapters_source = "regex"
        print(f"  Capítulos detectados (regex): {len(chapters)}")
    chapters_reliable = chapters_source == "manual_pages"

    extra_stop = {_normalize(s) for s in config.get("stopwords_extra", [])}

    # Preparar patrones de personajes
    char_patterns: list[tuple[str, str, re.Pattern]] = []
    for c in config.get("characters", []):
        aliases = c.get("aliases", [c.get("label", c["id"])])
        pat = build_character_pattern(aliases)
        char_patterns.append((c["id"], c.get("label", c["id"]), pat))

    # ── Menciones por capítulo ─────────────────────────────────────────────
    global_mentions: dict[str, int] = {cid: 0 for cid, _, _ in char_patterns}
    by_chapter: list[dict] = []
    chapter_stats: list[dict] = []

    for ch in chapters:
        wc   = ch.word_count
        sents = count_sentences(ch.text)
        paras = count_paragraphs(ch.text)

        ch_mentions: dict[str, dict] = {}
        for cid, label, pat in char_patterns:
            n = count_mentions(ch.text, pat)
            ch_mentions[cid] = {"label": label, "count": n}
            global_mentions[cid] += n

        by_chapter.append({
            "index":    ch.index,
            "title":    ch.title,
            "mentions": ch_mentions,
        })
        ch_row: dict[str, Any] = {
            "index":      ch.index,
            "title":      ch.title,
            "words":      wc,
            "characters": len(ch.text),
            "sentences":  sents,
            "paragraphs": paras,
            "avg_sent_len": avg_sentence_length(ch.text),
            "dialogue_ratio": dialogue_ratio(ch.text),
        }
        if ch.page_start > 0:
            ch_row["page_start"] = ch.page_start
            ch_row["page_end"] = ch.page_end
        chapter_stats.append(ch_row)

    # ── Estadísticas globales ─────────────────────────────────────────────
    total_words  = count_words(raw)
    total_sents  = count_sentences(raw)
    total_paras  = count_paragraphs(raw)
    read_silent  = max(1, round(total_words / WPM_SILENT))
    read_aloud   = max(1, round(total_words / WPM_ALOUD))
    ttr          = lexical_richness(raw)
    dial_ratio   = dialogue_ratio(raw)

    longest_ch   = max(chapter_stats, key=lambda x: x["words"]) if chapter_stats else None
    shortest_ch  = shortest_chapter(chapters)
    lp_words, lp_preview = longest_paragraph(raw)
    ls_words, ls_preview = longest_sentence(raw)

    # ── Totales de personajes ─────────────────────────────────────────────
    total_char_mentions = sum(global_mentions.values())
    character_totals: list[dict] = []
    for cid, label, pat in char_patterns:
        cnt = global_mentions[cid]
        fp  = first_appearance(raw, pat)
        character_totals.append({
            "id":            cid,
            "label":         label,
            "count":         cnt,
            "share_percent": round(100 * cnt / max(total_char_mentions, 1), 2),
            "first_appearance_word": fp,
        })
    character_totals.sort(key=lambda x: x["count"], reverse=True)

    return {
        "title":       config.get("title", pdf_path.stem),
        "source_pdf":  pdf_path.name,           # no ruta completa (privacidad)
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "lang":        config.get("lang", "es"),
        "chapters_source": chapters_source,
        "global": {
            "pages":                   n_pages,
            "words":                   total_words,
            "characters_with_spaces":  len(raw),
            "characters_without_spaces": len(re.sub(r"\s", "", raw)),
            "lines":                   raw.count("\n") + 1,
            "sentences":               total_sents,
            "paragraphs":              total_paras,
            "chapters_detected":       len(chapters),
            "chapters_reliable":       chapters_reliable,
            "reading_time_silent_min": read_silent,
            "reading_time_aloud_min":  read_aloud,
            "reading_time_minutes":    read_silent,
            "avg_words_per_sentence":  round(total_words / max(total_sents, 1), 1),
            "avg_words_per_paragraph": avg_paragraph_length(raw),
            "lexical_richness_ttr":    ttr,
            "dialogue_ratio":          dial_ratio,
        },
        "extremes": {
            "longest_chapter":           longest_ch,
            "shortest_chapter":          shortest_ch,
            "longest_paragraph_words":   lp_words,
            "longest_paragraph_preview": lp_preview,
            "longest_sentence_words":    ls_words,
            "longest_sentence_preview":  ls_preview,
        },
        "chapters":   chapter_stats,
        "characters": {
            "totals":     character_totals,
            "by_chapter": by_chapter,
        },
        "top_words": top_tokens(raw, extra_stop, n=40),
    }


# ══════════════════════════════════════════════════════════════════════════════
# Gráficos
# ══════════════════════════════════════════════════════════════════════════════

def _ensure_matplotlib() -> bool:
    try:
        import matplotlib  # noqa: F401
        return True
    except ImportError:
        print("matplotlib no instalado; omitiendo gráficos.", file=sys.stderr)
        return False


def write_charts(stats: dict, out_dir: Path) -> None:
    if not _ensure_matplotlib():
        return

    import matplotlib.pyplot as plt
    import numpy as np

    charts_dir = out_dir / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    title = stats["title"]

    # ── 1. Pastel: menciones por personaje ────────────────────────────────
    totals = [c for c in stats["characters"]["totals"] if c["count"] > 0]
    if totals:
        fig, ax = plt.subplots(figsize=(9, 9))
        labels = [f"{t['label']}\n({t['count']})" for t in totals]
        sizes  = [t["count"] for t in totals]
        colors = plt.cm.tab20.colors[: len(totals)]
        wedges, texts, autotexts = ax.pie(
            sizes,
            labels=labels,
            autopct="%1.1f%%",
            startangle=140,
            colors=colors,
            pctdistance=0.82,
        )
        for at in autotexts:
            at.set_fontsize(8)
        ax.set_title(f"Menciones por personaje — {title}", fontsize=13, pad=16)
        fig.tight_layout()
        fig.savefig(charts_dir / "character_mentions_pie.png", dpi=150)
        plt.close(fig)
        print(f"  ✔ character_mentions_pie.png")

    # ── 2. Barras: palabras por capítulo ──────────────────────────────────
    chapters = stats.get("chapters", [])
    if len(chapters) > 1:
        fig, ax = plt.subplots(figsize=(max(12, len(chapters) * 0.45), 5))
        idxs   = list(range(len(chapters)))
        words  = [c["words"] for c in chapters]
        labels = [
            (c["title"][:22] + "…" if len(c["title"]) > 22 else c["title"])
            for c in chapters
        ]
        bars = ax.bar(idxs, words, color="#4ade80", edgecolor="#166534", linewidth=0.6)
        # Línea de promedio
        avg = sum(words) / len(words)
        ax.axhline(avg, color="#dc2626", linewidth=1.2, linestyle="--",
                   label=f"Promedio {avg:.0f} pal.")
        ax.set_xlabel("Capítulo", fontsize=10)
        ax.set_ylabel("Palabras", fontsize=10)
        ax.set_title(f"Extensión por capítulo — {title}", fontsize=12)
        ax.set_xticks(idxs)
        ax.set_xticklabels(labels, rotation=60, ha="right", fontsize=6.5)
        ax.legend(fontsize=9)
        fig.tight_layout()
        fig.savefig(charts_dir / "chapter_word_counts.png", dpi=150)
        plt.close(fig)
        print(f"  ✔ chapter_word_counts.png")

    # ── 3. Mapa de calor: personajes × capítulos ──────────────────────────
    by_ch    = stats["characters"].get("by_chapter", [])
    char_ids = [c["id"] for c in totals[:10]] if totals else []
    if by_ch and char_ids:
        char_labels = [
            next(t["label"] for t in totals if t["id"] == cid)
            for cid in char_ids
        ]
        ch_labels = [
            (ch["title"][:28] + "…" if len(ch["title"]) > 28 else ch["title"])
            for ch in by_ch
        ]
        matrix = np.array([
            [ch["mentions"].get(cid, {}).get("count", 0) for cid in char_ids]
            for ch in by_ch
        ], dtype=float)

        h = max(6, len(by_ch) * 0.28)
        w = max(8, len(char_ids) * 1.1)
        fig, ax = plt.subplots(figsize=(w, h))
        im = ax.imshow(matrix, aspect="auto", cmap="YlOrRd")
        ax.set_xticks(range(len(char_ids)))
        ax.set_xticklabels(char_labels, rotation=40, ha="right", fontsize=8)
        ax.set_yticks(range(len(ch_labels)))
        ax.set_yticklabels(ch_labels, fontsize=6.5)
        ax.set_title(f"Presencia de personajes por capítulo — {title}", fontsize=11)
        fig.colorbar(im, ax=ax, label="Menciones", shrink=0.6)
        fig.tight_layout()
        fig.savefig(charts_dir / "character_by_chapter.png", dpi=150)
        plt.close(fig)
        print(f"  ✔ character_by_chapter.png")

    # ── 4. Barras horizontales: top palabras ──────────────────────────────
    top_words = stats.get("top_words", [])[:25]
    if top_words:
        fig, ax = plt.subplots(figsize=(8, max(5, len(top_words) * 0.32)))
        words_  = [t["word"] for t in reversed(top_words)]
        counts_ = [t["count"] for t in reversed(top_words)]
        ax.barh(words_, counts_, color="#6366f1", edgecolor="#312e81", linewidth=0.5)
        ax.set_xlabel("Frecuencia", fontsize=10)
        ax.set_title(f"Top 25 palabras más frecuentes — {title}", fontsize=11)
        ax.tick_params(axis="y", labelsize=8)
        fig.tight_layout()
        fig.savefig(charts_dir / "top_words_bar.png", dpi=150)
        plt.close(fig)
        print(f"  ✔ top_words_bar.png")

    # ── 5. Línea: oraciones por capítulo ─────────────────────────────────
    if len(chapters) > 1:
        fig, ax = plt.subplots(figsize=(max(12, len(chapters) * 0.45), 4))
        sents = [c["sentences"] for c in chapters]
        ax.plot(range(len(chapters)), sents, marker="o", color="#f59e0b",
                linewidth=1.5, markersize=4)
        ax.fill_between(range(len(chapters)), sents, alpha=0.2, color="#f59e0b")
        ax.set_xticks(range(len(chapters)))
        ax.set_xticklabels(
            [c["title"][:18] + "…" if len(c["title"]) > 18 else c["title"]
             for c in chapters],
            rotation=60, ha="right", fontsize=6.5,
        )
        ax.set_ylabel("Oraciones", fontsize=10)
        ax.set_title(f"Oraciones por capítulo — {title}", fontsize=11)
        fig.tight_layout()
        fig.savefig(charts_dir / "sentences_per_chapter.png", dpi=150)
        plt.close(fig)
        print(f"  ✔ sentences_per_chapter.png")

    print(f"\nGráficos en: {charts_dir}")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def _print_summary(stats: dict) -> None:
    g = stats["global"]
    sep = "─" * 52
    print(f"\n{'═' * 52}")
    print(f"  {stats['title']}")
    print(sep)
    print(f"  Páginas             : {g['pages']}")
    print(f"  Palabras            : {g['words']:,}".replace(",", "."))
    print(f"  Oraciones           : {g['sentences']:,}".replace(",", "."))
    print(f"  Párrafos            : {g['paragraphs']:,}".replace(",", "."))
    src = stats.get("chapters_source", "regex")
    print(f"  Partes / capítulos   : {g['chapters_detected']} ({src})")
    if g.get("chapters_reliable"):
        print("  División por páginas : manual (fiable)")
    print(sep)
    print(f"  Lectura silenciosa  : ~{g['reading_time_silent_min']} min")
    print(f"  Lectura en voz alta : ~{g['reading_time_aloud_min']} min")
    print(sep)
    print(f"  Riqueza léxica (TTR): {g['lexical_richness_ttr']:.4f}")
    print(f"  Ratio de diálogo    : {g['dialogue_ratio']:.2%}")
    print(f"  Prom. palabras/orac.: {g['avg_words_per_sentence']}")
    print(f"  Prom. palabras/pár. : {g['avg_words_per_paragraph']}")

    ex = stats["extremes"]
    print(sep)
    if ex.get("longest_chapter"):
        lc = ex["longest_chapter"]
        print(f"  Cap. más largo      : «{lc['title'][:40]}» ({lc['words']:,} pal.)".replace(",", "."))
    if ex.get("shortest_chapter"):
        sc = ex["shortest_chapter"]
        print(f"  Cap. más corto      : «{sc['title'][:40]}» ({sc['words']:,} pal.)".replace(",", "."))
    print(f"  Párrafo más largo   : {ex['longest_paragraph_words']} palabras")
    print(f"  Oración más larga   : {ex['longest_sentence_words']} palabras")

    top3 = stats["characters"]["totals"][:5]
    if top3:
        print(sep)
        print("  Top 5 personajes:")
        for t in top3:
            bar = "█" * min(20, max(1, t["count"] // max(top3[0]["count"] // 20, 1)))
            print(f"    {t['label']:<22} {t['count']:>5}  {bar}")
    print(f"{'═' * 52}\n")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Analiza manuscrito PDF (estadísticas, personajes y gráficos).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--pdf",    required=True, type=Path,
                        help="Ruta al PDF del manuscrito")
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG,
                        help="JSON de personajes y patrones (default: config/necromancia-medianoche.json)")
    parser.add_argument("--out",    type=Path, default=DEFAULT_OUT,
                        help="Carpeta de salida (default: ./output/)")
    parser.add_argument("--charts", action="store_true",
                        help="Generar gráficos PNG")
    parser.add_argument("--copy-to-src", action="store_true",
                        help="Copiar resumen global a src/data/…-stats.json")
    parser.add_argument("--copy-to-site", action="store_true",
                        help="Copiar stats completos a src/data/…-manuscript-stats.json")
    args = parser.parse_args()

    # ── Validaciones ───────────────────────────────────────────────────────
    if not args.pdf.is_file():
        print(f"ERROR: PDF no encontrado: {args.pdf}", file=sys.stderr)
        return 1
    if not args.config.is_file():
        print(f"ERROR: Config no encontrada: {args.config}", file=sys.stderr)
        print("       Asegúrate de que el JSON esté en la ruta indicada o usa --config <ruta>.",
              file=sys.stderr)
        return 1

    try:
        with args.config.open(encoding="utf-8") as f:
            config = json.load(f)
    except json.JSONDecodeError as e:
        print(f"ERROR: JSON de config inválido: {e}", file=sys.stderr)
        return 1

    # ── Análisis ───────────────────────────────────────────────────────────
    print(f"\nAnalizando: {args.pdf.name}")
    try:
        stats = analyze(args.pdf, config)
    except Exception as e:
        print(f"ERROR durante el análisis: {e}", file=sys.stderr)
        return 1

    # ── Salida JSON ────────────────────────────────────────────────────────
    args.out.mkdir(parents=True, exist_ok=True)
    out_json = args.out / "stats.json"
    with out_json.open("w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"  JSON: {out_json}")

    _print_summary(stats)

    # ── Gráficos ───────────────────────────────────────────────────────────
    if args.charts:
        print("Generando gráficos…")
        write_charts(stats, args.out)

    # ── Copias para el sitio ───────────────────────────────────────────────
    g = stats["global"]
    if args.copy_to_src:
        dest = SCRIPT_DIR.parent.parent / "src" / "data" / "necromancia-a-medianoche-stats.json"
        slim = {k: g[k] for k in (
            "words", "characters_with_spaces", "characters_without_spaces",
            "lines", "sentences", "paragraphs",
            "reading_time_silent_min", "reading_time_aloud_min",
            "avg_words_per_sentence", "avg_words_per_paragraph",
            "lexical_richness_ttr", "dialogue_ratio",
        )}
        slim["analyzed_at"] = stats["analyzed_at"]
        slim["lang"]        = stats["lang"]
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("w", encoding="utf-8") as f:
            json.dump(slim, f, ensure_ascii=False, indent=2)
        print(f"  Resumen global → {dest}")

    if args.copy_to_site:
        dest = SCRIPT_DIR.parent.parent / "src" / "data" / "necromancia-manuscript-stats.json"
        site = dict(stats)
        site.pop("source_pdf", None)     # no exponer rutas locales
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("w", encoding="utf-8") as f:
            json.dump(site, f, ensure_ascii=False, indent=2)
        print(f"  Stats completos  → {dest}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())