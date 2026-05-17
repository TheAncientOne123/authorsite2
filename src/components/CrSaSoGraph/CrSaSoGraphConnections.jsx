import React from 'react';
import styles from './CrSaSoGraphConnections.module.css';

export default function CrSaSoGraphConnections({groups, onSelectNode}) {
  if (!groups?.length || typeof onSelectNode !== 'function') return null;

  return (
    <section
      className={styles.connections}
      aria-labelledby="crSaSo-connections-heading"
    >
      <h3 id="crSaSo-connections-heading" className={styles.connectionsTitle}>
        Conexiones con otras fichas
      </h3>
      {groups.map((group) => (
        <div key={group.categoryKey} className={styles.connectionGroup}>
          <h4 className={styles.connectionGroupTitle}>{group.label}</h4>
          <ul className={styles.connectionList}>
            {group.nodes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={styles.connectionLink}
                  onClick={() => onSelectNode(n.id)}
                >
                  {n.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
