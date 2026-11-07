import React from 'react';
import styles from './GraphConnections.module.css';

/**
 * Conexiones de la ficha seleccionada, agrupadas por categoría.
 * Pasar el ratón por un nombre lo resalta en el grafo; clic lo selecciona.
 */
export default function GraphConnections({groups, onSelectNode, onHoverNode}) {
  if (!groups?.length || typeof onSelectNode !== 'function') return null;

  return (
    <section className={styles.connections} aria-labelledby="crSaSo-connections-heading">
      <h3 id="crSaSo-connections-heading" className={styles.connectionsTitle}>
        Conexiones
      </h3>
      {groups.map((group) => (
        <div key={group.categoryKey} className={styles.connectionGroup}>
          <h4 className={styles.connectionGroupTitle}>
            {group.color ? <span className={styles.dot} style={{background: group.color}} aria-hidden /> : null}
            {group.label}
            <span className={styles.count}>{group.nodes.length}</span>
          </h4>
          <ul className={styles.connectionList}>
            {group.nodes.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={styles.connectionLink}
                  onClick={() => onSelectNode(n.id)}
                  onMouseEnter={() => onHoverNode?.(n.id)}
                  onMouseLeave={() => onHoverNode?.(null)}
                  onFocus={() => onHoverNode?.(n.id)}
                  onBlur={() => onHoverNode?.(null)}
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
