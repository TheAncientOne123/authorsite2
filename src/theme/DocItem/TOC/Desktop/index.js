import React from 'react';
import {ThemeClassNames} from '@docusaurus/theme-common';
import TOC from '@theme/TOC';
import {useMergedDocToc} from '@site/src/theme/useMergedDocToc';

export default function DocItemTOCDesktop() {
  const {toc, frontMatter} = useMergedDocToc();
  return (
    <TOC
      toc={toc}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={ThemeClassNames.docs.docTocDesktop}
    />
  );
}
