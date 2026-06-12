import {useMemo} from 'react';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import {useExtraDocToc} from '@site/src/components/FeaturedArticle/extraDocToc';

/** Fusiona el TOC del doc actual con entradas registradas por componentes embebidos. */
export function useMergedDocToc() {
  const {toc, frontMatter} = useDoc();
  const extraToc = useExtraDocToc();
  const mergedToc = useMemo(() => [...toc, ...extraToc], [toc, extraToc]);
  return {toc: mergedToc, frontMatter};
}
