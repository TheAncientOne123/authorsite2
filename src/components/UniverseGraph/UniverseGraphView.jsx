import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {useHistory} from '@docusaurus/router';
import {useColorMode} from '@docusaurus/theme-common';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {UndirectedGraph} from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import louvain from 'graphology-communities-louvain';
import {SigmaContainer} from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import GraphConnections from './GraphConnections';
import {normalizeGraphPayload} from './graphPayload';
import GraphRuntime from './GraphRuntime';
import GraphSearch, {normalizeText} from './GraphSearch';
import GraphSettingsPanel from './GraphSettingsPanel';
import {BASE_SIGMA_SETTINGS, COMMUNITY_PALETTE, baseNodeSize} from './graphRendering';
import useForceLayout from './useForceLayout';
import styles from './UniverseGraphView.module.css';

/** Grafo del que viene el lector (lo usa DocBreadcrumbs para la miga «Grafo»). */
export const FROM_GRAPH_STORAGE_KEY = 'codiceFromGraph';
const OTHER_COLOR = '#a8a29e';
const NO_BOOK_COLOR = '#94a3b8';

const DEFAULT_PREFS = {
  /** null = todos los grupos visibles. */
  enabledCats: null,
  bookFilter: 'all',
  hideOrphans: true,
  colorMode: 'categoria',
  display: {nodeScale: 1, edgeScale: 1, labelThreshold: 9, curvedEdges: true},
  forces: {repulsion: 10, gravity: 1, linLog: false, continuous: false},
  settingsOpen: true,
};

function loadPrefs(storageKey) {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 996;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {...DEFAULT_PREFS, settingsOpen: !narrow, fresh: true};
    const p = JSON.parse(raw);
    return {
      ...DEFAULT_PREFS,
      ...p,
      display: {...DEFAULT_PREFS.display, ...p.display},
      forces: {...DEFAULT_PREFS.forces, ...p.forces},
    };
  } catch {
    return {...DEFAULT_PREFS, settingsOpen: !narrow};
  }
}

/** Construye el grafo con una disposición inicial breve: el worker anima el resto. */
function buildGraph(payload, colorOfGroup) {
  const graph = new UndirectedGraph();
  const seen = new Set();
  payload.nodes.forEach((n, i) => {
    if (!n?.id || seen.has(n.id)) return;
    seen.add(n.id);
    const angle = (i / payload.nodes.length) * Math.PI * 2 + Math.random() * 0.4;
    const r = 60 + Math.random() * 240;
    const size = baseNodeSize(n.degree);
    graph.addNode(n.id, {
      label: n.label,
      group: n.group,
      libro: n.libro ?? null,
      x: Math.cos(angle) * r,
      y: Math.sin(angle) * r,
      size,
      baseSize: size,
      color: colorOfGroup(n.group),
    });
  });
  for (const e of payload.edges) {
    if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;
    if (e.source === e.target || graph.hasEdge(e.source, e.target)) continue;
    graph.addEdge(e.source, e.target);
  }
  /*
   * Huérfanos (sin enlaces): la repulsión los lanzaría a miles de unidades y
   * arruinaría el encuadre. Se fijan en un anillo alrededor del clúster, como en Obsidian.
   */
  const orphans = graph.filterNodes((n) => graph.degree(n) === 0);
  for (const n of orphans) graph.setNodeAttribute(n, 'fixed', true);
  try {
    forceAtlas2.assign(graph, {
      iterations: 40,
      settings: {...forceAtlas2.inferSettings(graph), gravity: 1, scalingRatio: 10},
    });
  } catch (err) {
    console.warn('[UniverseGraph] ForceAtlas2:', err);
  }
  let maxR = 0;
  graph.forEachNode((n, a) => {
    if (!a.fixed) maxR = Math.max(maxR, Math.hypot(a.x, a.y));
  });
  orphans.forEach((n, i) => {
    const angle = (i / orphans.length) * Math.PI * 2 + 0.3;
    graph.mergeNodeAttributes(n, {x: Math.cos(angle) * maxR * 1.25, y: Math.sin(angle) * maxR * 1.25});
  });
  try {
    louvain.assign(graph, {nodeCommunityAttribute: 'community'});
  } catch (err) {
    console.warn('[UniverseGraph] Louvain:', err);
  }
  return graph;
}

/**
 * Visor de grafo de un universo (estilo Obsidian).
 * `graph` = {routeSlug, title, jsonPath, routeBase, label} (lo pasa GraphPage desde el plugin codice-data).
 */
export default function UniverseGraphView({graph: meta}) {
  const jsonUrl = useBaseUrl(meta.jsonPath);
  const prefsKey = `codiceGraphPrefs:v2:${meta.routeSlug}`;
  const {withBaseUrl} = useBaseUrlUtils();
  const history = useHistory();
  const {colorMode: siteColorMode} = useColorMode();
  const rootRef = useRef(null);

  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);

  const [prefs, setPrefs] = useState(() => loadPrefs(prefsKey));
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [query, setQuery] = useState('');
  const [localMode, setLocalMode] = useState(false);
  const [localDepth, setLocalDepth] = useState(1);
  const [focusRequest, setFocusRequest] = useState(null);
  const [fitRequest, setFitRequest] = useState(null);

  /* ── Datos ── */
  useEffect(() => {
    try {
      sessionStorage.removeItem(FROM_GRAPH_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = normalizeGraphPayload(await res.json(), meta.routeBase);
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jsonUrl, meta.routeBase]);

  /* Primera visita: valores iniciales elegidos en el admin (fuerzas, etiquetas, color). */
  useEffect(() => {
    if (!payload || !prefs.fresh) return;
    const s = payload.settings ?? {};
    setPrefs((p) => ({
      ...p,
      fresh: false,
      colorMode: s.colorMode === 'libro' ? 'libro' : s.colorMode === 'comunidad' ? 'comunidad' : 'categoria',
      display: {...p.display, labelThreshold: s.labelThreshold ?? p.display.labelThreshold},
      forces: {...p.forces, repulsion: s.repulsion ?? p.forces.repulsion, gravity: s.gravity ?? p.forces.gravity},
    }));
  }, [payload, prefs.fresh]);

  useEffect(() => {
    document.documentElement.classList.add('grafo-immersive-page');
    return () => document.documentElement.classList.remove('grafo-immersive-page');
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(prefsKey, JSON.stringify(prefs));
    } catch {
      /* ignore */
    }
  }, [prefs, prefsKey]);

  /* Leyenda (grupos del admin) y libros. */
  const legendByKey = useMemo(() => new Map((payload?.legend ?? []).map((g, i) => [g.key, {...g, order: i}])), [payload]);
  const bookByKey = useMemo(() => new Map((payload?.books ?? []).map((b) => [b.key, b])), [payload]);
  const groupColor = useCallback((key) => legendByKey.get(key)?.color ?? OTHER_COLOR, [legendByKey]);
  const groupLabel = useCallback((key) => legendByKey.get(key)?.label ?? key, [legendByKey]);

  const graph = useMemo(() => (payload?.nodes?.length ? buildGraph(payload, groupColor) : null), [payload, groupColor]);

  const nodeById = useMemo(
    () => new Map((payload?.nodes ?? []).map((n) => [n.id, n])),
    [payload],
  );

  /* ?nodo=<id> → selección inicial (enlaces profundos desde las fichas). */
  useEffect(() => {
    if (!graph) return;
    const id = new URLSearchParams(window.location.search).get('nodo');
    if (id && graph.hasNode(id)) {
      setSelectedId(id);
      setTimeout(() => setFocusRequest({id, n: Date.now()}), 1800);
    }
  }, [graph]);

  /* ── Simulación ── */
  const layout = useForceLayout(graph, prefs.forces);
  const forcesKey = `${prefs.forces.repulsion}|${prefs.forces.gravity}|${prefs.forces.linLog}`;

  /* ── Derivados ── */
  const enabledCats = useMemo(
    () => new Set(prefs.enabledCats ?? (payload?.legend ?? []).map((g) => g.key)),
    [prefs.enabledCats, payload],
  );

  /* Grupos con número de fichas (los vacíos no se muestran). */
  const categories = useMemo(() => {
    const counts = new Map();
    for (const n of payload?.nodes ?? []) counts.set(n.group, (counts.get(n.group) || 0) + 1);
    return (payload?.legend ?? []).map((g) => ({...g, count: counts.get(g.key) || 0})).filter((g) => g.count > 0);
  }, [payload]);

  const localSet = useMemo(() => {
    if (!graph || !localMode || !selectedId || !graph.hasNode(selectedId)) return null;
    const seen = new Set([selectedId]);
    let frontier = [selectedId];
    for (let d = 0; d < localDepth; d++) {
      const next = [];
      for (const n of frontier) {
        graph.forEachNeighbor(n, (m) => {
          if (!seen.has(m)) {
            seen.add(m);
            next.push(m);
          }
        });
      }
      frontier = next;
    }
    return seen;
  }, [graph, localMode, selectedId, localDepth]);

  const visibleNodes = useMemo(() => {
    const set = new Set();
    if (!graph) return set;
    graph.forEachNode((n, a) => {
      if (n === selectedId && localSet) {
        set.add(n);
        return;
      }
      if (!enabledCats.has(a.group)) return;
      if (prefs.bookFilter !== 'all' && a.libro !== prefs.bookFilter) return;
      if (prefs.hideOrphans && graph.degree(n) === 0) return;
      if (localSet && !localSet.has(n)) return;
      set.add(n);
    });
    return set;
  }, [graph, enabledCats, prefs.bookFilter, prefs.hideOrphans, localSet, selectedId]);

  const visibleEdgeCount = useMemo(() => {
    if (!graph) return 0;
    let c = 0;
    graph.forEachEdge((_e, _a, s, t) => {
      if (visibleNodes.has(s) && visibleNodes.has(t)) c++;
    });
    return c;
  }, [graph, visibleNodes]);

  const focusId = hoveredId ?? selectedId;
  const focusNeighbors = useMemo(() => {
    if (!graph || !focusId || !graph.hasNode(focusId)) return null;
    return new Set(graph.neighbors(focusId));
  }, [graph, focusId]);

  const searchMatches = useMemo(() => {
    const q = normalizeText(query);
    if (!graph || !q) return null;
    const set = new Set();
    graph.forEachNode((n, a) => {
      if (normalizeText(a.label).includes(q)) set.add(n);
    });
    return set;
  }, [graph, query]);

  const communities = useMemo(() => {
    if (!graph) return [];
    const groups = new Map();
    graph.forEachNode((n, a) => {
      if (a.community == null) return;
      if (!groups.has(a.community)) groups.set(a.community, []);
      groups.get(a.community).push(n);
    });
    return [...groups.entries()]
      .map(([id, members]) => {
        const hub = members.reduce((best, m) => (graph.degree(m) > graph.degree(best) ? m : best), members[0]);
        return {id, members, size: members.length, hubId: hub, hubLabel: graph.getNodeAttribute(hub, 'label')};
      })
      .sort((a, b) => b.size - a.size)
      .map((c, i) => ({...c, color: COMMUNITY_PALETTE[i % COMMUNITY_PALETTE.length]}));
  }, [graph]);

  const communityColor = useMemo(() => new Map(communities.map((c) => [c.id, c.color])), [communities]);

  const nodeColor = useCallback(
    (data) => {
      if (prefs.colorMode === 'libro') return bookByKey.get(data.libro)?.color ?? NO_BOOK_COLOR;
      if (prefs.colorMode === 'comunidad') return communityColor.get(data.community) ?? OTHER_COLOR;
      return groupColor(data.group);
    },
    [prefs.colorMode, communityColor, bookByKey, groupColor],
  );

  /* ── Acciones ── */
  const handleVolver = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) history.goBack();
    else history.push(withBaseUrl(`/${meta.routeBase}`));
  }, [history, withBaseUrl, meta.routeBase]);

  const markFromGraph = useCallback(() => {
    try {
      sessionStorage.setItem(FROM_GRAPH_STORAGE_KEY, meta.routeSlug);
    } catch {
      /* ignore */
    }
  }, [meta.routeSlug]);

  const onSelect = useCallback((id) => setSelectedId(id), []);
  const onHover = useCallback((id) => setHoveredId(id), []);

  const pickAndCenter = useCallback((id) => {
    setSelectedId(id);
    setFocusRequest({id, n: Date.now()});
  }, []);

  const openNode = useCallback(
    (id) => {
      const node = nodeById.get(id);
      if (!node) return;
      markFromGraph();
      history.push(withBaseUrl(node.route), {fromGraph: meta.routeSlug});
    },
    [history, markFromGraph, nodeById, withBaseUrl, meta.routeSlug],
  );

  const updatePrefs = useCallback((patch) => setPrefs((p) => ({...p, ...patch})), []);

  const toggleCat = useCallback(
    (key) =>
      setPrefs((p) => {
        const s = new Set(p.enabledCats ?? (payload?.legend ?? []).map((g) => g.key));
        if (s.has(key)) s.delete(key);
        else s.add(key);
        return {...p, enabledCats: [...s]};
      }),
    [payload],
  );

  const reorganize = useCallback(() => {
    if (!graph) return;
    graph.updateEachNodeAttributes((_n, a) =>
      a.fixed ? a : {...a, x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.5) * 300},
    );
    setFitRequest({reset: true, n: Date.now()});
    layout.reheat(3500);
  }, [graph, layout]);

  /* Vista local: encuadrar al entrar o cambiar profundidad. */
  useEffect(() => {
    if (localMode && selectedId) setFitRequest({n: Date.now()});
  }, [localMode, localDepth, selectedId]);

  useEffect(() => {
    if (!selectedId) setLocalMode(false);
  }, [selectedId]);

  /* Teclado: Esc limpia selección. */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT') return;
      setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }, []);

  /* ── Panel de detalle ── */
  const selectedMeta = selectedId ? nodeById.get(selectedId) ?? null : null;

  const neighborsByCategory = useMemo(() => {
    if (!graph || !selectedId || !graph.hasNode(selectedId)) return [];
    const groups = new Map();
    graph.forEachNeighbor(selectedId, (other) => {
      const meta = nodeById.get(other);
      if (!meta) return;
      if (!groups.has(meta.group)) groups.set(meta.group, []);
      groups.get(meta.group).push(meta);
    });
    const order = (k) => legendByKey.get(k)?.order ?? 999;
    const keys = [...groups.keys()].sort((a, b) => order(a) - order(b) || a.localeCompare(b));
    return keys.map((k) => ({
      categoryKey: k,
      label: groupLabel(k),
      color: groupColor(k),
      nodes: groups
        .get(k)
        .sort((a, b) => String(a.label).localeCompare(String(b.label), 'es', {sensitivity: 'base'})),
    }));
  }, [graph, selectedId, nodeById, legendByKey, groupLabel, groupColor]);

  if (error) {
    return (
      <div className={styles.fallback}>
        <p>
          No se pudo cargar el grafo ({error}). Ejecuta <code>npm run sync</code> (o{' '}
          <code>npm run build</code>) y recarga.
        </p>
      </div>
    );
  }

  if (!payload || !graph) {
    return <div className={styles.fallback}>Cargando datos del grafo…</div>;
  }

  const bookLabel = selectedMeta?.libro
    ? bookByKey.get(selectedMeta.libro)?.label ?? selectedMeta.libro
    : null;

  return (
    <div ref={rootRef} className={styles.root} data-graph-theme={siteColorMode}>
      <header className={styles.topbar}>
        <button type="button" className={styles.volver} onClick={handleVolver}>
          ← Volver
        </button>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{payload.title || meta.title}</h1>
          <span className={styles.subtitle}>{meta.label}</span>
        </div>
        <GraphSearch
          nodes={payload.nodes}
          query={query}
          onQuery={setQuery}
          onPick={pickAndCenter}
          groupColor={groupColor}
          groupLabel={groupLabel}
        />
      </header>

      <div className={styles.stage}>
        <SigmaContainer className={styles.sigma} graph={graph} settings={BASE_SIGMA_SETTINGS}>
          <GraphRuntime
            graph={graph}
            colorMode={siteColorMode}
            visibleNodes={visibleNodes}
            focusId={focusId}
            focusNeighbors={focusNeighbors}
            selectedId={selectedId}
            searchMatches={searchMatches}
            nodeColor={nodeColor}
            display={prefs.display}
            layout={layout}
            forcesKey={forcesKey}
            focusRequest={focusRequest}
            fitRequest={fitRequest}
            onHover={onHover}
            onSelect={onSelect}
            onOpen={openNode}
          />
        </SigmaContainer>

        <GraphSettingsPanel
          open={prefs.settingsOpen}
          onToggle={() => updatePrefs({settingsOpen: !prefs.settingsOpen})}
          categories={categories}
          books={payload.books}
          filters={payload.filters}
          enabledCats={enabledCats}
          onToggleCat={toggleCat}
          bookFilter={prefs.bookFilter}
          onBookFilter={(v) => updatePrefs({bookFilter: v})}
          hideOrphans={prefs.hideOrphans}
          onHideOrphans={(v) => updatePrefs({hideOrphans: v})}
          colorMode={prefs.colorMode}
          onColorMode={(v) => updatePrefs({colorMode: v})}
          communities={communities}
          onPickNode={pickAndCenter}
          display={prefs.display}
          onDisplay={(patch) => setPrefs((p) => ({...p, display: {...p.display, ...patch}}))}
          forces={prefs.forces}
          onForces={(patch) => setPrefs((p) => ({...p, forces: {...p.forces, ...patch}}))}
          running={layout.running}
          onReorganize={reorganize}
          onResetSettings={() => setPrefs({...DEFAULT_PREFS, settingsOpen: true, fresh: true})}
        />

        <div className={styles.viewControls} role="group" aria-label="Cámara">
          <button type="button" onClick={() => setFitRequest({reset: true, n: Date.now()})} title="Centrar vista">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="2" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
            <span className={styles.srOnly}>Centrar vista</span>
          </button>
          <button type="button" onClick={toggleFullscreen} title="Pantalla completa">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
            <span className={styles.srOnly}>Pantalla completa</span>
          </button>
        </div>

        <div className={styles.statusBar} aria-live="polite">
          <span className={clsx(styles.simDot, layout.running && styles.simDotOn)} aria-hidden />
          <span>
            {visibleNodes.size} fichas · {visibleEdgeCount} conexiones
            {localSet ? ` · vista local (${localDepth} salto${localDepth > 1 ? 's' : ''})` : ''}
          </span>
          <span className={styles.statusHint}>Clic: detalles · Doble clic: abrir ficha · Arrastra los nodos</span>
        </div>

        {selectedMeta ? (
          <aside className={styles.panel} aria-label={`Detalles de ${selectedMeta.label}`}>
            <button type="button" className={styles.panelClose} onClick={() => setSelectedId(null)} aria-label="Cerrar detalles">
              ×
            </button>
            {selectedMeta.image ? (
              <div className={styles.panelImageWrap}>
                <img
                  className={styles.panelImage}
                  src={/^https?:\/\//i.test(selectedMeta.image) ? selectedMeta.image : withBaseUrl(selectedMeta.image)}
                  alt={selectedMeta.imageAlt || selectedMeta.label}
                  loading="lazy"
                />
              </div>
            ) : null}
            <p className={styles.panelKicker}>
              <span className={styles.swatch} style={{background: groupColor(selectedMeta.group)}} aria-hidden />
              {groupLabel(selectedMeta.group)}
              {bookLabel ? <span className={styles.panelBook}> · {bookLabel}</span> : null}
            </p>
            <h2 className={styles.panelTitle}>{selectedMeta.label}</h2>
            {selectedMeta.excerpt ? <p className={styles.panelExcerpt}>{selectedMeta.excerpt}</p> : null}

            <div className={styles.panelActions}>
              <Link
                className={clsx('button button--primary button--sm', styles.openBtn)}
                to={selectedMeta.route}
                state={{fromGraph: meta.routeSlug}}
                onClick={markFromGraph}
              >
                Abrir ficha
              </Link>
              <button
                type="button"
                className={clsx(styles.localBtn, localMode && styles.localBtnOn)}
                onClick={() => setLocalMode((v) => !v)}
                aria-pressed={localMode}
              >
                Vista local
              </button>
            </div>
            {localMode ? (
              <div className={styles.depthRow} role="radiogroup" aria-label="Profundidad de la vista local">
                <span>Profundidad</span>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="radio"
                    aria-checked={localDepth === d}
                    className={clsx(styles.depthBtn, localDepth === d && styles.depthBtnOn)}
                    onClick={() => setLocalDepth(d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            ) : null}

            <p className={styles.panelMeta}>
              <strong>{selectedMeta.degree}</strong> conexiones
            </p>
            {neighborsByCategory.length > 0 ? (
              <GraphConnections groups={neighborsByCategory} onSelectNode={pickAndCenter} onHoverNode={onHover} />
            ) : null}
          </aside>
        ) : null}
      </div>
    </div>
  );
}
