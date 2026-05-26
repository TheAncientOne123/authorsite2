from __future__ import annotations

import re
import sys
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    import fitz  # PyMuPDF
except ImportError as exc:
    raise SystemExit(
        "PyMuPDF no encontrado.\n"
        "Instala dependencias: pip install -r scripts/manuscript_stats/requirements.txt"
    ) from exc

WPM_SILENT = 250
WPM_ALOUD = 130

_FUNCTION_WORDS: set[str] = {
    "el", "la", "los", "las", "un", "una", "de", "del", "al", "en", "con", "por",
    "para", "que", "como", "pero", "sin", "sobre", "entre", "hasta", "desde",
    "ser", "es", "son", "fue", "era", "estar", "esta", "estaba", "estaban",
    "haber", "ha", "han", "he", "habia", "tener", "tiene", "tenia", "hacer",
    "hace", "hacia", "ir", "iba", "poder", "puede", "decir", "dijo", "dice",
    "yo", "tu", "el", "ella", "ellos", "ellas", "me", "te", "se", "le", "les",
    "lo", "su", "sus", "mi", "mis", "nos", "os", "este", "esta", "estos",
    "estas", "ese", "esa", "esos", "esas", "aquel", "aquella", "muy", "mas",
    "tan", "ya", "no", "si", "sí", "tambien", "solo", "todo", "toda", "todos",
    "todas", "algo", "nada", "quien", "quienes", "cual", "cuales", "donde",
    "cuando", "aqui", "alli", "hay", "asi", "pues", "entonces", "vez", "veces",
    "cada", "mismo", "misma", "otro", "otra", "otros", "otras",
}


@dataclass
class Chapter:
    index: int
    title: str
    text: str
    page_start: int = 0
    page_end: int = 0

    @property
    def word_count(self) -> int:
        return count_words(self.text)


def _extract_page_text(page: fitz.Page) -> str:
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
    doc = fitz.open(str(pdf_path))
    pages = [_clean_text(_extract_page_text(page)) for page in doc]
    n_pages = doc.page_count
    doc.close()
    return pages, n_pages


_NOISE_TITLE_RE = re.compile(r"^\s*(\d{1,4}|[IVXivx]{1,6}|[•·\-–—*]+)\s*$")


def _clean_title(raw: str, fallback: str) -> str:
    title = raw.strip().replace("\n", " ")
    title = re.sub(r"\s{2,}", " ", title)[:140]
    if _NOISE_TITLE_RE.match(title):
        return fallback
    return title or fallback


def split_chapters(text: str, patterns: list[str]) -> list[Chapter]:
    if not patterns:
        return [Chapter(0, "Documento completo", text)]

    combined = "|".join(f"(?:{p})" for p in patterns)
    regex = re.compile(combined, re.MULTILINE | re.IGNORECASE)
    matches = list(regex.finditer(text))
    if not matches:
        return [Chapter(0, "Documento completo", text)]

    chapters: list[Chapter] = []
    pre = text[: matches[0].start()].strip()
    if pre and len(pre.split()) > 30:
        chapters.append(Chapter(0, "Introducción / Portada", pre))

    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
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
    trim_sparse_pages: bool = False,
    sparse_page_min_words: int = 12,
) -> list[Chapter]:
    """Divide por rangos de página del PDF (1-based, inclusive)."""
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

        extract_ps, extract_pe = ps, pe_clamped
        part_trim = part.get("trim_sparse_pages", trim_sparse_pages)
        if part_trim:
            extract_ps, extract_pe = _trim_sparse_boundary_pages(
                page_texts, extract_ps, extract_pe, sparse_page_min_words,
            )
            if extract_ps > extract_pe:
                print(
                    f"  AVISO: «{title}» quedó vacía tras omitir páginas casi en blanco ({ps}-{pe})",
                    file=sys.stderr,
                )
                continue
            if (extract_ps, extract_pe) != (ps, pe_clamped):
                print(
                    f"  «{title}»: extracción {extract_ps}-{extract_pe} "
                    f"(configurado {ps}-{pe_clamped})",
                    file=sys.stderr,
                )

        body = "\n\n".join(page_texts[extract_ps - 1 : extract_pe]).strip()
        chapters.append(Chapter(i, title, body, page_start=ps, page_end=pe_clamped))

    if not chapters:
        raise ValueError("Ninguna parte pudo mapearse a páginas del PDF")
    return chapters


def _trim_sparse_boundary_pages(
    page_texts: list[str],
    page_start: int,
    page_end: int,
    min_words: int,
) -> tuple[int, int]:
    start, end = page_start, page_end
    while start <= end and count_words(page_texts[start - 1]) < min_words:
        start += 1
    while end >= start and count_words(page_texts[end - 1]) < min_words:
        end -= 1
    return start, end


def count_words(text: str) -> int:
    return len(re.findall(r"\b\w+\b", text, flags=re.UNICODE))


_SENT_SPLIT = re.compile(r"(?<=[.!?…])\s+|(?<=\n)\n")


def count_sentences(text: str) -> int:
    parts = _SENT_SPLIT.split(text)
    return sum(1 for p in parts if p.strip() and len(p.strip()) > 3)


def count_paragraphs(text: str) -> int:
    return sum(1 for p in re.split(r"\n\s*\n", text) if p.strip())


def avg_sentence_length(text: str) -> float:
    sents = _SENT_SPLIT.split(text)
    sents = [s.strip() for s in sents if s.strip() and len(s.strip()) > 3]
    if not sents:
        return 0.0
    return round(sum(count_words(s) for s in sents) / len(sents), 1)


def avg_paragraph_length(text: str) -> float:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    if not paras:
        return 0.0
    return round(sum(count_words(p) for p in paras) / len(paras), 1)


def raw_tokens(text: str) -> list[str]:
    return re.findall(r"\b[\wáéíóúñüÁÉÍÓÚÑÜ]+\b", text.lower(), flags=re.UNICODE)


def lexical_richness(text: str) -> float:
    tokens = raw_tokens(text)
    if not tokens:
        return 0.0
    return round(len(set(tokens)) / len(tokens), 4)


def unique_types(tokens: list[str]) -> int:
    return len(set(tokens))


def mattr(tokens: list[str], window: int = 1000) -> float:
    if not tokens:
        return 0.0
    if len(tokens) < window:
        return round(len(set(tokens)) / len(tokens), 4)
    ttrs = [
        len(set(tokens[i : i + window])) / window
        for i in range(len(tokens) - window + 1)
    ]
    return round(sum(ttrs) / len(ttrs), 4)


def lexical_density(tokens: list[str]) -> float:
    if not tokens:
        return 0.0
    content = sum(1 for t in tokens if _normalize(t) not in _FUNCTION_WORDS)
    return round(content / len(tokens), 4)


def vocabulary_growth_curve(
    tokens: list[str],
    step: int = 500,
) -> list[dict[str, int]]:
    if not tokens:
        return []
    seen: set[str] = set()
    curve: list[dict[str, int]] = []
    for i, token in enumerate(tokens, 1):
        seen.add(token)
        if i == 1 or i % step == 0 or i == len(tokens):
            curve.append({"words_read": i, "unique_types": len(seen)})
    return curve


def analyze_lexical(text: str, mattr_window: int = 1000, growth_step: int = 500) -> dict[str, Any]:
    tokens = raw_tokens(text)
    total = len(tokens)
    types_count = unique_types(tokens)
    ttr = round(types_count / max(total, 1), 4)
    density = lexical_density(tokens)
    return {
        "total_tokens": total,
        "unique_types": types_count,
        "ttr_traditional": ttr,
        "mattr": mattr(tokens, mattr_window),
        "mattr_window": mattr_window,
        "lexical_density_percent": round(density * 100, 2),
        "vocabulary_growth": vocabulary_growth_curve(tokens, growth_step),
    }


def dialogue_ratio(text: str) -> float:
    lines = text.splitlines()
    total = sum(len(line) for line in lines if line.strip())
    dialogue = sum(
        len(line) for line in lines
        if re.match(r"^\s*(—|«|\"|\")", line)
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


def manuscript_page_count(chapters: list[Chapter]) -> int:
    return sum(max(0, ch.page_end - ch.page_start + 1) for ch in chapters if ch.page_start > 0)


def build_character_pattern(aliases: list[str]) -> re.Pattern:
    unique = sorted({a.strip() for a in aliases if a.strip()}, key=len, reverse=True)
    inner = "|".join(re.escape(a) for a in unique)
    return re.compile(
        rf"(?<![A-Za-záéíóúñüÀ-ÿ])(?:{inner})(?![A-Za-záéíóúñüÀ-ÿ])",
        re.IGNORECASE | re.UNICODE,
    )


def count_mentions(text: str, pattern: re.Pattern) -> int:
    return len(pattern.findall(text))


def first_appearance(text: str, pattern: re.Pattern) -> int:
    m = pattern.search(text)
    if not m:
        return -1
    return count_words(text[: m.start()])


def _normalize(word: str) -> str:
    replacements = str.maketrans("áéíóúü", "aeiouu")
    return word.lower().translate(replacements)


def tokenize_words(text: str) -> list[str]:
    return [
        _normalize(t)
        for t in re.findall(r"\b[\wáéíóúñüÁÉÍÓÚÑÜ]+\b", text, flags=re.UNICODE)
    ]


def is_content_token(token: str, min_len: int = 3) -> bool:
    if len(token) < min_len:
        return False
    if token.isdigit():
        return False
    if re.fullmatch(r"(.)\1{2,}", token):
        return False
    return True


def build_excluded_terms(config: dict) -> set[str]:
    excluded: set[str] = set()
    for c in config.get("characters", []):
        for alias in c.get("aliases", [c.get("label", c["id"])]):
            excluded.add(_normalize(alias))
    for term in config.get("exclude_terms", config.get("stopwords_extra", [])):
        excluded.add(_normalize(term))
    return excluded


def analyze_vocabulary(
    raw: str,
    chapters: list[Chapter],
    excluded: set[str],
) -> dict[str, Any]:
    tokens = [t for t in tokenize_words(raw) if is_content_token(t)]
    filtered = [t for t in tokens if t not in _FUNCTION_WORDS and t not in excluded]

    global_counter = Counter(filtered)
    token_chapters: dict[str, set[int]] = {}
    chapter_terms: list[dict[str, Any]] = []

    for ch in chapters:
        ch_tokens = [
            t for t in tokenize_words(ch.text)
            if is_content_token(t) and t not in _FUNCTION_WORDS and t not in excluded
        ]
        ch_counter = Counter(ch_tokens)
        for word in ch_counter:
            token_chapters.setdefault(word, set()).add(ch.index)

        unique = len(set(ch_tokens))
        chapter_terms.append({
            "index": ch.index,
            "title": ch.title,
            "unique_words": unique,
            "lexical_richness_ttr": round(unique / max(len(ch_tokens), 1), 4),
            "top_terms": [{"word": w, "count": c} for w, c in ch_counter.most_common(8)],
        })

    hapax = sum(1 for _, c in global_counter.items() if c == 1)
    frequent_terms = [
        {
            "word": w,
            "count": c,
            "chapters": len(token_chapters.get(w, set())),
        }
        for w, c in global_counter.most_common(30)
    ]

    return {
        "unique_words": len(set(filtered)),
        "hapax_legomena": hapax,
        "frequent_terms": frequent_terms,
        "by_chapter": chapter_terms,
    }


def analyze(pdf_path: Path, config: dict) -> dict[str, Any]:
    print(f"  Extrayendo texto de '{pdf_path.name}'…")
    page_texts, n_pages = extract_pages_from_pdf(pdf_path)

    if not page_texts or not any(page_texts):
        raise ValueError("No se pudo extraer texto del PDF. ¿Está escaneado sin OCR?")

    parts_cfg: list[dict] = config.get("parts") or []
    trim_sparse = bool(config.get("trim_sparse_pages", False))
    sparse_min = int(config.get("sparse_page_min_words", 12))

    if parts_cfg:
        chapters = split_chapters_by_parts(
            page_texts, parts_cfg, n_pages, trim_sparse, sparse_min,
        )
        chapters_source = "manual_pages"
        print(f"  Partes por páginas (config): {len(chapters)}")
    else:
        raw_full = _clean_text("\f".join(page_texts))
        patterns: list[str] = config.get("chapter_patterns", [])
        chapters = split_chapters(raw_full, patterns)
        chapters_source = "regex"
        print(f"  Capítulos detectados (regex): {len(chapters)}")

    chapters_reliable = chapters_source == "manual_pages"
    manuscript_text = _clean_text("\n\n".join(ch.text for ch in chapters if ch.text.strip()))

    if not manuscript_text:
        raise ValueError("No hay texto de manuscrito en las partes configuradas.")

    char_patterns: list[tuple[str, str, re.Pattern]] = []
    for c in config.get("characters", []):
        aliases = c.get("aliases", [c.get("label", c["id"])])
        pat = build_character_pattern(aliases)
        char_patterns.append((c["id"], c.get("label", c["id"]), pat))

    excluded_terms = build_excluded_terms(config)
    global_mentions: dict[str, int] = {cid: 0 for cid, _, _ in char_patterns}
    by_chapter: list[dict] = []
    chapter_stats: list[dict] = []

    for ch in chapters:
        wc = ch.word_count
        sents = count_sentences(ch.text)
        paras = count_paragraphs(ch.text)

        ch_mentions: dict[str, dict] = {}
        present: list[str] = []
        for cid, label, pat in char_patterns:
            n = count_mentions(ch.text, pat)
            ch_mentions[cid] = {"label": label, "count": n}
            global_mentions[cid] += n
            if n > 0:
                present.append(cid)

        by_chapter.append({
            "index": ch.index,
            "title": ch.title,
            "mentions": ch_mentions,
            "characters_present": present,
        })
        ch_row: dict[str, Any] = {
            "index": ch.index,
            "title": ch.title,
            "words": wc,
            "characters": len(ch.text),
            "sentences": sents,
            "paragraphs": paras,
            "avg_sent_len": avg_sentence_length(ch.text),
            "dialogue_ratio": dialogue_ratio(ch.text),
        }
        if ch.page_start > 0:
            ch_row["page_start"] = ch.page_start
            ch_row["page_end"] = ch.page_end
        chapter_stats.append(ch_row)

    total_words = count_words(manuscript_text)
    total_sents = count_sentences(manuscript_text)
    total_paras = count_paragraphs(manuscript_text)
    read_silent = max(1, round(total_words / WPM_SILENT))
    read_aloud = max(1, round(total_words / WPM_ALOUD))
    ttr = lexical_richness(manuscript_text)
    dial_ratio = dialogue_ratio(manuscript_text)

    ms_pages_cfg = config.get("manuscript_pdf_pages") or {}
    configured_ms_pages = None
    if "start" in ms_pages_cfg and "end" in ms_pages_cfg:
        configured_ms_pages = int(ms_pages_cfg["end"]) - int(ms_pages_cfg["start"]) + 1

    ms_pages = configured_ms_pages if configured_ms_pages is not None else manuscript_page_count(chapters)

    longest_ch = max(chapter_stats, key=lambda x: x["words"]) if chapter_stats else None
    shortest_ch = shortest_chapter(chapters)
    lp_words, lp_preview = longest_paragraph(manuscript_text)
    ls_words, ls_preview = longest_sentence(manuscript_text)

    total_char_mentions = sum(global_mentions.values())
    character_totals: list[dict] = []
    for cid, label, pat in char_patterns:
        cnt = global_mentions[cid]
        fp = first_appearance(manuscript_text, pat)
        character_totals.append({
            "id": cid,
            "label": label,
            "count": cnt,
            "share_percent": round(100 * cnt / max(total_char_mentions, 1), 2),
            "first_appearance_word": fp,
        })
    character_totals.sort(key=lambda x: x["count"], reverse=True)
    vocabulary = analyze_vocabulary(manuscript_text, chapters, excluded_terms)
    lexical = analyze_lexical(manuscript_text)

    return {
        "title": config.get("title", pdf_path.stem),
        "source_pdf": pdf_path.name,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "lang": config.get("lang", "es"),
        "chapters_source": chapters_source,
        "global": {
            "pdf_pages": n_pages,
            "manuscript_pages": ms_pages,
            "pages": ms_pages,
            "words": total_words,
            "characters_with_spaces": len(manuscript_text),
            "characters_without_spaces": len(re.sub(r"\s", "", manuscript_text)),
            "lines": manuscript_text.count("\n") + 1,
            "sentences": total_sents,
            "paragraphs": total_paras,
            "chapters_detected": len(chapters),
            "chapters_reliable": chapters_reliable,
            "reading_time_silent_min": read_silent,
            "reading_time_aloud_min": read_aloud,
            "reading_time_minutes": read_silent,
            "avg_words_per_sentence": round(total_words / max(total_sents, 1), 1),
            "avg_words_per_paragraph": avg_paragraph_length(manuscript_text),
            "lexical_richness_ttr": ttr,
            "dialogue_ratio": dial_ratio,
        },
        "extremes": {
            "longest_chapter": longest_ch,
            "shortest_chapter": shortest_ch,
            "longest_paragraph_words": lp_words,
            "longest_paragraph_preview": lp_preview,
            "longest_sentence_words": ls_words,
            "longest_sentence_preview": ls_preview,
        },
        "chapters": chapter_stats,
        "characters": {
            "totals": character_totals,
            "by_chapter": by_chapter,
        },
        "vocabulary": vocabulary,
        "lexical": lexical,
    }
