import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import {HtmlClassNameProvider} from '@docusaurus/theme-common';
import styles from './GraphPage.module.css';

/**
 * Página de grafo de un universo. La crea el plugin codice-data en /grafos/<ruta>;
 * `graph` = {routeSlug, title, jsonPath, routeBase, label}.
 * Sigma/graphology se cargan solo en el cliente (WebGL no existe en SSR).
 */
function ClientGraph({graph}) {
  const [View, setView] = useState(null);
  useEffect(() => {
    let cancelled = false;
    import('./UniverseGraphView').then((m) => {
      if (!cancelled) setView(() => m.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  if (!View) return <div style={{padding: '2rem', textAlign: 'center'}}>Cargando grafo…</div>;
  return <View graph={graph} />;
}

export default function GraphPage({graph}) {
  return (
    // La clase oculta navbar / barra de anuncios (ver custom.css) y Docusaurus la mantiene en <html>.
    <HtmlClassNameProvider className="grafo-immersive-page">
      <Layout
        title={`${graph.title} · ${graph.label}`}
        description={`Red interactiva de fichas enlazadas en ${graph.label}.`}
        wrapperClassName={styles.layoutFill}
        noFooter
      >
        <BrowserOnly fallback={<div style={{padding: '2rem', textAlign: 'center'}}>Cargando…</div>}>
          {() => <ClientGraph graph={graph} />}
        </BrowserOnly>
      </Layout>
    </HtmlClassNameProvider>
  );
}
