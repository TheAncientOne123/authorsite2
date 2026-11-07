import React, {useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import styles from './UniverseGraphView.module.css';

export function normalizeText(s) {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .trim();
}

/**
 * Buscador con autocompletado. Mientras se escribe, el grafo resalta las
 * coincidencias (vía `onQuery`); Enter o clic centra la ficha elegida.
 */
export default function GraphSearch({nodes, query, onQuery, onPick, groupColor, groupLabel}) {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return [];
    const starts = [];
    const contains = [];
    for (const n of nodes) {
      const l = normalizeText(n.label);
      if (l.startsWith(q)) starts.push(n);
      else if (l.includes(q)) contains.push(n);
    }
    const byDegree = (a, b) => (b.degree ?? 0) - (a.degree ?? 0);
    return [...starts.sort(byDegree), ...contains.sort(byDegree)].slice(0, 8);
  }, [nodes, query]);

  useEffect(() => setActive(0), [query]);

  /* Atajo "/" para enfocar el buscador. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = (n) => {
    onPick(n.id);
    onQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      pick(results[active]);
    } else if (e.key === 'Escape') {
      onQuery('');
      setOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className={styles.search}>
      <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className={styles.searchInput}
        placeholder="Buscar ficha…"
        value={query}
        onChange={(e) => {
          onQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="crsaso-graph-search-results"
        aria-autocomplete="list"
        aria-label="Buscar ficha en el grafo"
      />
      <kbd className={styles.searchKbd} aria-hidden>
        /
      </kbd>
      {open && results.length > 0 ? (
        <ul id="crsaso-graph-search-results" className={styles.searchResults} role="listbox">
          {results.map((n, i) => (
            <li
              key={n.id}
              role="option"
              aria-selected={i === active}
              className={clsx(styles.searchResult, i === active && styles.searchResultActive)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(n);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className={styles.swatch} style={{background: groupColor(n.group)}} aria-hidden />
              <span className={styles.searchResultLabel}>{n.label}</span>
              <span className={styles.searchResultCat}>{groupLabel(n.group)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
