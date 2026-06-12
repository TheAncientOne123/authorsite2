import React from 'react';
import clsx from 'clsx';
import styles from './UniverseSelector.module.css';
import Link from '@docusaurus/Link';
import useBaseUrl from '@docusaurus/useBaseUrl';

const universes = [
  {
    title: 'El Orbe de los Destinos',
    description: 'Un reino amurallado por la historia y la magia, donde los destinos se entrelazan.',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/orbe/portadaLowQual',
    comingSoon: true,
  },
  {
    title: 'Crónicas de Sangre y Sombra',
    description: 'Oscuridad, sangre, deseo y una guerra secreta que cambiará la historia.',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/cronicas-sangre/portadaNMLowQual',
    path: '/CrSaSo',
    graphPath: '/grafos/sangre-y-sombra',
    comingSoon: false,
  },
  {
    title: 'Meridian',
    description: 'Facciones, razas, campañas y un mapa en expansión: el códice de un mundo por descubrir.',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/meridian-contenidos/meridian-portada',
    comingSoon: true,
  },
  {
    title: 'El Túmulo de las Cataratas Lúgubres',
    description: 'Ensayos y libros standalone que no forman parte de un universo mayor.',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/q_auto/f_auto/v1780631262/tcl-portada_l9ji9y.png',
    path: '/Tumulo',
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
