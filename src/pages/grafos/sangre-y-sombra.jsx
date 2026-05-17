import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import styles from './sangre-y-sombra.module.css';

/**
 * Carga sigma/graphology solo en el cliente (evita WebGL en SSR).
 */
function ClientGraphLoader() {
  const [Comp, setComp] = useState(null);

  useEffect(() => {
    let cancelled = false;
    import('@site/src/components/CrSaSoGraph/CrSaSoGraphView')
      .then((m) => {
        if (!cancelled) setComp(() => m.default);
      })
      .catch(() => {
        if (!cancelled) setComp(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Comp) {
    return <div style={{padding: '2rem', textAlign: 'center'}}>Cargando grafo…</div>;
  }
  return <Comp />;
}

export default function GrafoSangreYSombraPage() {
  return (
    <Layout
      title="Grafo de relaciones"
      description="Red interactiva de fichas enlazadas en Crónicas de Sangre y Sombra."
      wrapperClassName={styles.layoutFill}
      noFooter
    >
      <BrowserOnly fallback={<div style={{padding: '2rem', textAlign: 'center'}}>Cargando…</div>}>
        {() => <ClientGraphLoader />}
      </BrowserOnly>
    </Layout>
  );
}
