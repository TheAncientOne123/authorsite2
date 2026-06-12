import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ExtraDocTocProvider} from '@site/src/components/FeaturedArticle/extraDocToc';
import {getUniverseThemeId} from '@site/src/utils/getUniverseFromPathname';

/**
 * Swizzle de @theme/Root.
 * En cada cambio de ruta aplica o elimina data-universe en <html> para
 * que los archivos CSS de tema por universo puedan activarse mediante
 * selectores como html[data-universe='meridian'][data-theme='dark'] { ... }.
 */
export default function Root({children}) {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();

  useEffect(() => {
    const themeId = getUniverseThemeId(pathname, siteConfig.baseUrl);
    const el = document.documentElement;
    if (themeId) {
      el.setAttribute('data-universe', themeId);
    } else {
      el.removeAttribute('data-universe');
    }
  }, [pathname, siteConfig.baseUrl]);

  return <ExtraDocTocProvider>{children}</ExtraDocTocProvider>;
}
