import React, {useEffect} from 'react';
import {useLocation} from '@docusaurus/router';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {ExtraDocTocProvider} from '@site/src/components/FeaturedArticle/extraDocToc';
import {getUniverseThemeId} from '@site/src/utils/getUniverseFromPathname';
import useCodiceData from '@site/src/data/useCodiceData';

/**
 * Swizzle de @theme/Root.
 * En cada cambio de ruta aplica o elimina data-universe en <html> para
 * que los archivos CSS de tema por universo puedan activarse mediante
 * selectores como html[data-universe='meridian'][data-theme='dark'] { ... }.
 */
export default function Root({children}) {
  const {pathname} = useLocation();
  const {siteConfig} = useDocusaurusContext();
  const codice = useCodiceData();
  const universes = codice?.universes.map((u) => ({path: `/${u.routeBase}`, themeId: u.themeId}));

  useEffect(() => {
    const themeId = getUniverseThemeId(pathname, siteConfig.baseUrl, universes);
    const el = document.documentElement;
    if (themeId) {
      el.setAttribute('data-universe', themeId);
    } else {
      el.removeAttribute('data-universe');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, siteConfig.baseUrl, codice]);

  return <ExtraDocTocProvider>{children}</ExtraDocTocProvider>;
}
