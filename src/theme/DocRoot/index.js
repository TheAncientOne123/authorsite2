import React from 'react';
import clsx from 'clsx';
import {HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import {
  DocsSidebarProvider,
  useDocRootMetadata,
  useDocsVersion,
} from '@docusaurus/plugin-content-docs/client';
import DocRootLayout from '@theme/DocRoot/Layout';
import NotFoundContent from '@theme/NotFound/Content';

/** Sidebar por defecto cuando la ficha no está listada en sidebars.js */
const DEFAULT_SIDEBAR_BY_PLUGIN = {
  cronicas: 'CrSaSoSidebar',
  meridian: 'meridianSidebar',
  orbe: 'orbeSidebar',
  tumulo: 'tumuloSidebar',
};

export default function DocRoot(props) {
  const currentDocRouteMetadata = useDocRootMetadata(props);
  const version = useDocsVersion();

  if (!currentDocRouteMetadata) {
    return <NotFoundContent />;
  }

  let {docElement, sidebarName, sidebarItems} = currentDocRouteMetadata;

  if (!sidebarName) {
    const fallback = DEFAULT_SIDEBAR_BY_PLUGIN[version.pluginId];
    if (fallback && version.docsSidebars[fallback]) {
      sidebarName = fallback;
      sidebarItems = version.docsSidebars[fallback];
    }
  }

  return (
    <HtmlClassNameProvider className={clsx(ThemeClassNames.page.docsDocPage)}>
      <DocsSidebarProvider name={sidebarName} items={sidebarItems}>
        <DocRootLayout>{docElement}</DocRootLayout>
      </DocsSidebarProvider>
    </HtmlClassNameProvider>
  );
}
