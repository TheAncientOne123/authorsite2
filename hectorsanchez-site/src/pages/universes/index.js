import React from 'react';
import Layout from '@theme/Layout';
import UniverseSelector from '@site/src/components/UniverseFeature/UniverseSelector';
import Link from '@docusaurus/Link';

export default function UniverseSelectorPage() {
  return (
    <Layout
      title="Universos"
      description="Selecciona el universo que deseas explorar">
      <main style={{padding: '2rem'}}>
        <div style={{marginBottom: '1.5rem'}}>
          <Link
            to="/"
            className="button button--secondary button--sm"
          >
            ← Volver al inicio
          </Link>
        </div>
        <UniverseSelector />
      </main>
    </Layout>
  );
}
