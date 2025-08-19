import React from 'react';
import clsx from 'clsx';
import styles from './UniverseSelector.module.css';
import Link from '@docusaurus/Link';

const universes = [
  {
    title: 'El Orbe de los Destinos',
    description: 'Un reino amurallado por la historia y la magia, donde los destinos se entrelazan.',
    image: '/img/portadaLowQual.png',
    comingSoon: true,            // <- nuevo
  },
  {
    title: 'Crónicas de Sangre y Sombras',
    description: 'Oscuridad, sangre, deseo y una guerra secreta que cambiará la historia.',
    image: '/img/portadaNMLowQual.png',
    path: '/CrSaSo',
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
          const CardTag = isDisabled ? 'div' : Link;           // <- sin Link si está en proceso
          const cardProps = isDisabled ? { 'aria-disabled': true } : { to: u.path };

          return (
            <CardTag
              key={idx}
              {...cardProps}
              className={clsx('text--center', styles.universeCard, isDisabled && styles.disabled)}
              title={isDisabled ? 'Próximamente' : undefined}
            >
              <img src={u.image} alt={u.title} className={styles.universeImage} />
              <h3>{u.title}</h3>
              <p>{u.description}</p>

              {isDisabled && <span className={styles.badge}>Próximamente</span>}
            </CardTag>
          );
        })}
      </div>
    </section>
  );
}
