import React from 'react';
import clsx from 'clsx';
import styles from './UniverseGraphView.module.css';

function Section({title, defaultOpen = true, children}) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.sectionTitle}>{title}</summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}

function Slider({label, value, min, max, step, onChange, format}) {
  return (
    <label className={styles.slider}>
      <span className={styles.sliderHead}>
        <span>{label}</span>
        <span className={styles.sliderValue}>{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

function Toggle({label, checked, onChange, hint}) {
  return (
    <label className={styles.toggle}>
      <span>
        {label}
        {hint ? <span className={styles.toggleHint}>{hint}</span> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.switch} aria-hidden />
    </label>
  );
}

const COLOR_MODES = [
  {key: 'categoria', label: 'Grupo'},
  {key: 'libro', label: 'Libro'},
  {key: 'comunidad', label: 'Comunidad'},
];

export default function GraphSettingsPanel({
  open,
  onToggle,
  categories,
  books = [],
  filters = {},
  enabledCats,
  onToggleCat,
  bookFilter,
  onBookFilter,
  hideOrphans,
  onHideOrphans,
  colorMode,
  onColorMode,
  communities,
  onPickNode,
  display,
  onDisplay,
  forces,
  onForces,
  running,
  onReorganize,
  onResetSettings,
}) {
  return (
    <div className={clsx(styles.settings, open && styles.settingsOpen)}>
      <button
        type="button"
        className={styles.settingsToggle}
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="crsaso-graph-settings"
        title={open ? 'Ocultar ajustes' : 'Ajustes del grafo'}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="4" y1="21" x2="4" y2="14" />
          <line x1="4" y1="10" x2="4" y2="3" />
          <line x1="12" y1="21" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12" y2="3" />
          <line x1="20" y1="21" x2="20" y2="16" />
          <line x1="20" y1="12" x2="20" y2="3" />
          <line x1="1" y1="14" x2="7" y2="14" />
          <line x1="9" y1="8" x2="15" y2="8" />
          <line x1="17" y1="16" x2="23" y2="16" />
        </svg>
        <span>Ajustes</span>
      </button>

      {open ? (
        <div id="crsaso-graph-settings" className={styles.settingsBody}>
          <Section title="Filtros">
            {filters.groups !== false ? (
            <ul className={styles.catList}>
              {categories.map((c) => (
                <li key={c.key}>
                  <label className={clsx(styles.catItem, !enabledCats.has(c.key) && styles.catItemOff)}>
                    <input type="checkbox" checked={enabledCats.has(c.key)} onChange={() => onToggleCat(c.key)} />
                    <span className={styles.swatch} style={{background: c.color}} aria-hidden />
                    <span className={styles.catLabel}>{c.label}</span>
                    <span className={styles.catCount}>{c.count}</span>
                  </label>
                </li>
              ))}
            </ul>
            ) : null}
            {filters.book !== false && books.length ? (
            <label className={styles.field}>
              <span>Libro</span>
              <select value={bookFilter} onChange={(e) => onBookFilter(e.target.value)}>
                <option value="all">Todos</option>
                {books.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
            ) : null}
            <Toggle label="Ocultar huérfanos" checked={hideOrphans} onChange={onHideOrphans} />
          </Section>

          <Section title="Colores">
            <div className={styles.segmented} role="radiogroup" aria-label="Colorear nodos por">
              {COLOR_MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  role="radio"
                  aria-checked={colorMode === m.key}
                  className={clsx(styles.segment, colorMode === m.key && styles.segmentOn)}
                  onClick={() => onColorMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {colorMode === 'categoria' ? (
              <ul className={styles.legendList}>
                {categories.map((c) => (
                  <li key={c.key}>
                    <span className={styles.swatch} style={{background: c.color}} aria-hidden />
                    {c.label}
                  </li>
                ))}
              </ul>
            ) : null}
            {colorMode === 'libro' ? (
              <ul className={styles.legendList}>
                {books.map((b) => (
                  <li key={b.key}>
                    <span className={styles.swatch} style={{background: b.color}} aria-hidden />
                    {b.label}
                  </li>
                ))}
                <li>
                  <span className={styles.swatch} style={{background: '#94a3b8'}} aria-hidden />
                  Sin libro asignado
                </li>
              </ul>
            ) : null}
            {colorMode === 'comunidad' ? (
              <>
                <p className={styles.note}>
                  {communities.length} comunidades detectadas automáticamente según cómo se enlazan las fichas.
                </p>
                <ul className={styles.legendList}>
                  {communities.map((c) => (
                    <li key={c.id}>
                      <span className={styles.swatch} style={{background: c.color}} aria-hidden />
                      <button type="button" className={styles.linkBtn} onClick={() => onPickNode(c.hubId)}>
                        {c.hubLabel}
                      </button>
                      <span className={styles.catCount}>{c.size}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </Section>

          <Section title="Visualización">
            <Slider
              label="Tamaño de nodos"
              value={display.nodeScale}
              min={0.4}
              max={2.2}
              step={0.1}
              format={(v) => `${v.toFixed(1)}×`}
              onChange={(v) => onDisplay({nodeScale: v})}
            />
            <Slider
              label="Grosor de enlaces"
              value={display.edgeScale}
              min={0.3}
              max={3}
              step={0.1}
              format={(v) => `${v.toFixed(1)}×`}
              onChange={(v) => onDisplay({edgeScale: v})}
            />
            <Slider
              label="Etiquetas visibles"
              value={18 - display.labelThreshold}
              min={0}
              max={18}
              step={1}
              format={(v) => (v >= 18 ? 'todas' : v <= 0 ? 'mín.' : v)}
              onChange={(v) => onDisplay({labelThreshold: 18 - v})}
            />
            <Toggle label="Enlaces curvos" checked={display.curvedEdges} onChange={(v) => onDisplay({curvedEdges: v})} />
          </Section>

          <Section title="Fuerzas" defaultOpen={false}>
            <Slider
              label="Repulsión"
              value={forces.repulsion}
              min={1}
              max={40}
              step={1}
              onChange={(v) => onForces({repulsion: v})}
            />
            <Slider
              label="Gravedad"
              value={forces.gravity}
              min={0.05}
              max={5}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) => onForces({gravity: v})}
            />
            <Toggle
              label="Agrupar clústeres"
              hint="modo LinLog"
              checked={forces.linLog}
              onChange={(v) => onForces({linLog: v})}
            />
            <Toggle
              label="Simulación continua"
              checked={forces.continuous}
              onChange={(v) => onForces({continuous: v})}
            />
            <div className={styles.btnRow}>
              <button type="button" className={styles.smallBtn} onClick={onReorganize}>
                Reorganizar
              </button>
              <span className={clsx(styles.simState, running && styles.simStateOn)}>
                {running ? 'Simulando…' : 'En reposo'}
              </span>
            </div>
          </Section>

          <button type="button" className={styles.resetLink} onClick={onResetSettings}>
            Restablecer ajustes
          </button>
        </div>
      ) : null}
    </div>
  );
}
