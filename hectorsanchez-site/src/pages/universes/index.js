import React from 'react';
import Layout from '@theme/Layout';
import UniverseSelector from '@site/src/components/UniverseFeature/UniverseSelector';

export default function UniverseSelectorPage() {
  return (
    <Layout
      title="Universos"
      description="Selecciona el universo que deseas explorar">
      <main>
        <UniverseSelector />
      </main>
    </Layout>
  );
}
