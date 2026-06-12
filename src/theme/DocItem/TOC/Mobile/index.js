import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import TOCCollapsible from '@theme/TOCCollapsible';
import {useMergedDocToc} from '@site/src/theme/useMergedDocToc';
import styles from './styles.module.css';

export default function DocItemTOCMobile() {
  const {toc, frontMatter} = useMergedDocToc();
  return (
    <TOCCollapsible
      toc={toc}
      minHeadingLevel={frontMatter.toc_min_heading_level}
      maxHeadingLevel={frontMatter.toc_max_heading_level}
      className={clsx(ThemeClassNames.docs.docTocMobile, styles.tocMobile)}
    />
  );
}
