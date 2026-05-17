import React, {useCallback, useEffect, useMemo, useState} from 'react';
import Link from '@docusaurus/Link';
import {useHistory} from '@docusaurus/router';
import useBaseUrl, {useBaseUrlUtils} from '@docusaurus/useBaseUrl';
import {UndirectedGraph} from 'graphology';
import forceAtlas2 from 'graphology-layout-forceatlas2';
import {
  SigmaContainer,
  useLoadGraph,
  useRegisterEvents,
  useSigma,
  ZoomControl,
  FullScreenControl,
  ControlsContainer,
} from '@react-sigma/core';
import '@react-sigma/core/lib/style.css';
import {CR_SA_SO_BOOKS} from '@site/src/data/crSaSoBooks';
import {
  CR_SA_SO_GRAPH_LEGEND,
  CR_SA_SO_OTHER_COLOR,
  categorySortIndex,
  getCrSaSoCategoryColor,
  getCrSaSoCategoryLabel,
} from '@site/src/data/crSaSoGraphCategories';
import CrSaSoGraphConnections from './CrSaSoGraphConnections';
import styles from './CrSaSoGraphView.module.css';

const FROM_GRAPH_STORAGE_KEY = 'crSaSoFromGraph';

function docHref(nodeId) {
  return `/CrSaSo/${nodeId.split('/').map(encodeURIComponent).join('/')}`;
}

/** Radio en px (itemSizesReference: screen). Legible sin tapar el grafo entero. */
function nodeRadiusPx(degree) {
  const d = Math.max(0, Number(degree) || 0);
  return Math.max(5, Math.min(16, 5 + Math.sqrt(d) * 0.85));
}

function drawCrSaSoNodeHover(context, data, settings) {
  const size = settings.labelSize;
  const font = settings.labelFont;
  const weight = settings.labelWeight;
  context.font = `${weight} ${size}px ${font}`;
  const PADDING = 2;
  const bg = 'rgba(15, 23, 42, 0.94)';
  const fg = '#f8fafc';
  context.fillStyle = bg;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 10;
  context.shadowColor = 'rgba(0, 0, 0, 0.4)';
  if (typeof data.label === 'string' && data.label) {
    const textWidth = context.measureText(data.label).width;
    const boxWidth = Math.round(textWidth + 8);
    const boxHeight = Math.round(size + 2 * PADDING);
    const radius = Math.max(data.size, size / 2) + PADDING;
    const angleRadian = Math.asin(boxHeight / 2 / radius);
    const xDeltaCoord = Math.sqrt(Math.abs(radius ** 2 - (boxHeight / 2) ** 2));
    context.beginPath();
    context.moveTo(data.x + xDeltaCoord, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y + boxHeight / 2);
    context.lineTo(data.x + radius + boxWidth, data.y - boxHeight / 2);
    context.lineTo(data.x + xDeltaCoord, data.y - boxHeight / 2);
    context.arc(data.x, data.y, radius, angleRadian, -angleRadian);
    context.closePath();
    context.fill();
  } else {
    context.beginPath();
    context.arc(data.x, data.y, data.size + PADDING, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }
  context.shadowBlur = 0;
  if (typeof data.label === 'string' && data.label) {
    context.fillStyle = fg;
    context.fillText(data.label, data.x + data.size + 3, data.y + size / 3);
  }
}

const SIGMA_SETTINGS = {
  renderLabels: true,
  labelDensity: 1,
  labelRenderedSizeThreshold: 0,
  itemSizesReference: 'screen',
  zoomToSizeRatioFunction: () => 1,
  defaultEdgeColor: 'rgba(255, 255, 255, 0.82)',
  minEdgeThickness: 1.15,
  labelSize: 13,
  labelColor: {color: '#ffffff'},
  defaultDrawNodeHover: drawCrSaSoNodeHover,
  minCameraRatio: 0.08,
  maxCameraRatio: 2.5,
};

/** Centra la cámara en coordenadas *framed* [0,1], no en las crudas de graphology. */
function GraphCameraOnSelect({focusNodeId}) {
  const sigma = useSigma();

  useEffect(() => {
    if (!sigma || !focusNodeId) return;
    const graph = sigma.getGraph();
    if (!graph.hasNode(focusNodeId)) return;

    let cancelled = false;
    const id = requestAnimationFrame(() => {
      if (cancelled) return;
      const graphPos = graph.getNodeAttributes(focusNodeId);
      if (!Number.isFinite(graphPos.x) || !Number.isFinite(graphPos.y)) return;
      const framed = sigma.normalizationFunction({
        x: graphPos.x,
        y: graphPos.y,
      });
      const cam = sigma.getCamera();
      const {ratio} = cam.getState();
      cam.animate({x: framed.x, y: framed.y, ratio}, {duration: 380, easing: 'cubicOut'});
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [focusNodeId, sigma]);

  return null;
}

function GraphLoader({payload, onSelectNode}) {
  const loadGraph = useLoadGraph();
  const registerEvents = useRegisterEvents();

  useEffect(() => {
    if (!payload?.nodes?.length) return;

    const graph = new UndirectedGraph();
    const {nodes, edges} = payload;

    const seenIds = new Set();
    for (const n of nodes) {
      if (!n?.id || seenIds.has(n.id)) continue;
      seenIds.add(n.id);
      const angle = Math.random() * Math.PI * 2;
      const rad = 120 + Math.random() * 380;
      graph.addNode(n.id, {
        label: n.label,
        x: Math.cos(angle) * rad,
        y: Math.sin(angle) * rad,
        size: nodeRadiusPx(n.degree),
        color: getCrSaSoCategoryColor(n.category),
      });
    }

    for (const e of edges) {
      if (!graph.hasNode(e.source) || !graph.hasNode(e.target)) continue;
      if (graph.hasUndirectedEdge(e.source, e.target)) continue;
      try {
        graph.addUndirectedEdge(e.source, e.target);
      } catch {
        /* skip duplicate */
      }
    }

    try {
      forceAtlas2.assign(graph, {
        iterations: 160,
        settings: {
          gravity: 0.35,
          barnesHutOptimize: true,
          scalingRatio: 2.5,
          slowDown: 1,
        },
      });
    } catch (err) {
      console.warn('[CrSaSoGraph] ForceAtlas2:', err);
    }

    loadGraph(graph, true);
  }, [payload, loadGraph]);

  useEffect(() => {
    registerEvents({
      clickNode: (event) => onSelectNode?.(event.node),
      clickStage: () => onSelectNode?.(null),
    });
  }, [registerEvents, onSelectNode]);

  return null;
}

export default function CrSaSoGraphView() {
  const jsonUrl = useBaseUrl('/graphs/crSaSo.json');
  const {withBaseUrl} = useBaseUrlUtils();
  const history = useHistory();
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

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
        const data = await res.json();
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) setError(String(e.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jsonUrl]);

  useEffect(() => {
    document.documentElement.classList.add('grafo-immersive-page');
    return () => document.documentElement.classList.remove('grafo-immersive-page');
  }, []);

  const handleVolver = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      history.goBack();
    } else {
      history.push('/CrSaSo');
    }
  }, [history]);

  const onSelectNode = useCallback((id) => setSelectedId(id), []);

  const selectedMeta = useMemo(() => {
    if (!selectedId || !payload?.nodes) return null;
    return payload.nodes.find((n) => n.id === selectedId) ?? null;
  }, [selectedId, payload]);

  const nodeById = useMemo(() => {
    if (!payload?.nodes) return new Map();
    return new Map(payload.nodes.map((n) => [n.id, n]));
  }, [payload]);

  const neighborsByCategory = useMemo(() => {
    if (!selectedId || !payload?.edges) return [];
    const neighbors = [];
    for (const e of payload.edges) {
      let other = null;
      if (e.source === selectedId) other = e.target;
      else if (e.target === selectedId) other = e.source;
      else continue;
      const meta = nodeById.get(other);
      if (meta) neighbors.push(meta);
    }
    const groups = new Map();
    for (const n of neighbors) {
      const cat = n.category || 'raíz';
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(n);
    }
    const keys = [...groups.keys()].sort((a, b) => {
      const d = categorySortIndex(a) - categorySortIndex(b);
      if (d !== 0) return d;
      return a.localeCompare(b);
    });
    return keys.map((k) => ({
      categoryKey: k,
      label: getCrSaSoCategoryLabel(k),
      nodes: [...groups.get(k)].sort((a, b) =>
        String(a.label).localeCompare(String(b.label), 'es', {sensitivity: 'base'}),
      ),
    }));
  }, [selectedId, payload, nodeById]);

  const markFromGraph = useCallback(() => {
    try {
      sessionStorage.setItem(FROM_GRAPH_STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  }, []);

  if (error) {
    return (
      <div className={styles.fallback}>
        <p>No se pudo cargar el grafo ({error}). Ejecuta <code>npm run build</code> o <code>node scripts/build-graph-crSaSo.mjs</code> y recarga.</p>
      </div>
    );
  }

  if (!payload) {
    return <div className={styles.fallback}>Cargando datos del grafo…</div>;
  }

  return (
    <div className={styles.root}>
      <header className={styles.toolbar}>
        <div className={styles.toolbarRow}>
          <button type="button" className={styles.volver} onClick={handleVolver}>
            Volver
          </button>
        </div>
        <div className={styles.legend}>
          {CR_SA_SO_GRAPH_LEGEND.map((c) => (
            <span key={c.key} className={styles.legendItem}>
              <span className={styles.legendSwatch} style={{background: c.color}} aria-hidden />
              {c.label}
            </span>
          ))}
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} style={{background: CR_SA_SO_OTHER_COLOR}} aria-hidden />
            Otras rutas
          </span>
        </div>
      </header>

      <div className={styles.main}>
        <div className={styles.graphColumn}>
          <div className={styles.canvasWrap}>
            <SigmaContainer className={styles.sigma} settings={SIGMA_SETTINGS}>
              <GraphLoader payload={payload} onSelectNode={onSelectNode} />
              <GraphCameraOnSelect focusNodeId={selectedId} />
              <ControlsContainer position="bottom-right">
                <ZoomControl />
                <FullScreenControl />
              </ControlsContainer>
            </SigmaContainer>
          </div>
        </div>

        <aside className={styles.panel} aria-live="polite">
          {selectedMeta ? (
            <>
              <h2 className={styles.panelTitle}>{selectedMeta.label}</h2>
              {selectedMeta.image ? (
                <div className={styles.panelImageWrap}>
                  <img
                    className={styles.panelImage}
                    src={
                      /^https?:\/\//i.test(selectedMeta.image)
                        ? selectedMeta.image
                        : withBaseUrl(selectedMeta.image)
                    }
                    alt={selectedMeta.imageAlt || selectedMeta.label}
                    loading="lazy"
                  />
                </div>
              ) : null}
              {selectedMeta.excerpt ? (
                <p className={styles.panelExcerpt}>{selectedMeta.excerpt}</p>
              ) : null}
              <p className={styles.panelMeta}>
                <strong>Categoría:</strong> {getCrSaSoCategoryLabel(selectedMeta.category)}
              </p>
              {selectedMeta.libro ? (
                <p className={styles.panelMeta}>
                  <strong>Libro:</strong>{' '}
                  {CR_SA_SO_BOOKS.find((b) => b.key === selectedMeta.libro)?.label ?? selectedMeta.libro}
                </p>
              ) : null}
              <p className={styles.panelMeta}>
                <strong>Conexiones:</strong> {selectedMeta.degree}
              </p>
              <Link
                className="button button--primary button--block"
                to={docHref(selectedMeta.id)}
                state={{fromCrSaSoGraph: true}}
                onClick={markFromGraph}
              >
                Abrir ficha
              </Link>
              {neighborsByCategory.length > 0 ? (
                <CrSaSoGraphConnections groups={neighborsByCategory} onSelectNode={onSelectNode} />
              ) : null}
            </>
          ) : (
            <p className={styles.panelHint}>Haz clic en un nodo para ver detalles y enlace a la ficha.</p>
          )}
        </aside>
      </div>
    </div>
  );
}
