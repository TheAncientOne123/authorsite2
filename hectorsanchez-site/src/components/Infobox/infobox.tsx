import React from 'react';
import styles from './infobox.module.css';

export default function Infobox({children}) {
return (
<aside className={styles.infobox}
style={{position:'relative'}}>
{children}
</aside>
);
}