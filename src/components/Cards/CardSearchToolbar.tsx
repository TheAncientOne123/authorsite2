import React, {useEffect, useId, useMemo, useRef, useState} from 'react';
import type {FilterDimension} from './CardsFromFolder';
import styles from './cardSearchToolbar.module.css';

export type SortKey = 'title' | 'recent' | 'oldest';

export const SORT_OPTIONS: {value: SortKey; label: string}[] = [
  {value: 'title', label: 'Orden A–Z'},
  {value: 'recent', label: 'Más recientes'},
  {value: 'oldest', label: 'Más antiguos'},
];

type ChipOption = {value: string; label: string};

type ChipMenuProps = {
  label: string;
  selected: string;
  options: ChipOption[];
  emptyLabel?: string;
  onSelect: (value: string) => void;
};

function ChipMenu({label, selected, options, emptyLabel = 'Todos', onSelect}: ChipMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const activeOption = options.find((o) => o.value === selected);
  const valueLabel = activeOption ? activeOption.label : emptyLabel;
  const isActive = selected !== '';

  return (
    <div className={styles.chipWrap} ref={wrapRef}>
      <button
        type="button"
        className={isActive ? `${styles.chip} ${styles.chipActive}` : styles.chip}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={styles.chipLabel}>{label}</span>
        <span className={styles.chipValue}>{valueLabel}</span>
        <span className={styles.chevron} aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div className={styles.menu} id={menuId} role="listbox">
          <button
            type="button"
            role="option"
            aria-selected={selected === ''}
            className={selected === '' ? `${styles.menuItem} ${styles.menuItemActive}` : styles.menuItem}
            onClick={() => {
              onSelect('');
              setOpen(false);
            }}
          >
            {emptyLabel}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="option"
              aria-selected={selected === opt.value}
              className={
                selected === opt.value
                  ? `${styles.menuItem} ${styles.menuItemActive}`
                  : styles.menuItem
              }
              onClick={() => {
                onSelect(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type CardSearchToolbarProps = {
  query: string;
  onQueryChange: (value: string) => void;
  placeholder?: string;
  filterDimensions: FilterDimension[];
  filterOptionSets: Map<string, Set<string>>;
  filterSelections: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  formatOptionLabel: (key: string, value: string) => string;
  sortBy: SortKey;
  onSortChange: (value: SortKey) => void;
  resultCount: number;
  hasSearchTokens: boolean;
};

export default function CardSearchToolbar({
  query,
  onQueryChange,
  placeholder = 'Buscar…',
  filterDimensions,
  filterOptionSets,
  filterSelections,
  onFilterChange,
  formatOptionLabel,
  sortBy,
  onSortChange,
  resultCount,
  hasSearchTokens,
}: CardSearchToolbarProps) {
  const dimensionOptions = useMemo(() => {
    const map = new Map<string, ChipOption[]>();
    for (const dim of filterDimensions) {
      const set = filterOptionSets.get(dim.key);
      const opts = set ? [...set].sort((a, b) => a.localeCompare(b, 'es')) : [];
      map.set(
        dim.key,
        opts.map((value) => ({value, label: formatOptionLabel(dim.key, value)})),
      );
    }
    return map;
  }, [filterDimensions, filterOptionSets, formatOptionLabel]);

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <div className={styles.searchSegment}>
          <span className={styles.searchIcon} aria-hidden>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            aria-label="Buscar tarjetas"
            className={styles.searchInput}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
          {query ? (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => onQueryChange('')}
              aria-label="Limpiar búsqueda"
            >
              ×
            </button>
          ) : null}
        </div>

        {filterDimensions.length > 0 ? <span className={styles.divider} aria-hidden /> : null}

        <div className={styles.chips}>
          {filterDimensions.map((dim) => {
            const options = dimensionOptions.get(dim.key) ?? [];
            if (options.length === 0) return null;
            return (
              <ChipMenu
                key={dim.key}
                label={dim.label}
                selected={filterSelections[dim.key] ?? ''}
                options={options}
                onSelect={(value) => onFilterChange(dim.key, value)}
              />
            );
          })}
          <ChipMenu
            label="Ordenar"
            selected={sortBy === 'title' ? '' : sortBy}
            options={SORT_OPTIONS.filter((o) => o.value !== 'title')}
            emptyLabel="Orden A–Z"
            onSelect={(value) => onSortChange((value || 'title') as SortKey)}
          />
        </div>
      </div>

      <div className={styles.meta}>
        {hasSearchTokens
          ? `${resultCount} resultado${resultCount === 1 ? '' : 's'}`
          : `${resultCount} elemento${resultCount === 1 ? '' : 's'}`}
      </div>
    </div>
  );
}
