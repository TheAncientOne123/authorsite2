import React from 'react';
import clsx from 'clsx';
import styles from './UniverseSelector.module.css';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

const universes = [
  {
    title: 'El Orbe de los Destinos',
    description: 'Un reino amurallado por la historia y la magia, donde los destinos se entrelazan.',
    image: '/img/portadaLowQual.png',
    comingSoon: true,
  },
  {
    title: 'Crónicas de Sangre y Sombra',
    description: 'Oscuridad, sangre, deseo y una guerra secreta que cambiará la historia.',
    image: '/img/portadaNMLowQual.png',
    path: '/CrSaSo',
    graphPath: '/grafos/sangre-y-sombra',
    comingSoon: false,
  },
];

export default function UniverseSelector() {
  return (
    <section className={clsx('container', styles.universeSection)}>
      <div className="row">
        <div className="col col--8 col--offset-2 text--center">
          <h2>Elige un universo</h2>
          <p>Explora cada saga de forma independiente según tus intereses.</p>
        </div>
      </div>

      <div className={styles.universeGrid}>
        {universes.map((u, idx) => {
          const isDisabled = u.comingSoon;

          if (isDisabled) {
            return (
              <div
                key={idx}
                className={clsx(styles.universeCard, styles.disabled)}
                aria-disabled
              >
                <img src={useBaseUrl(u.image)} alt={u.title} className={styles.universeImage} />
                <h3>{u.title}</h3>
                <p>{u.description}</p>
                <span className={styles.badge}>Próximamente</span>
              </div>
            );
          }

          return (
            <div key={idx} className={styles.universeCard}>
              <Link
                to={u.path}
                className={clsx(styles.universeCardLink)}
              >
                <img src={useBaseUrl(u.image)} alt={u.title} className={styles.universeImage} />
                <h3>{u.title}</h3>
                <p>{u.description}</p>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
