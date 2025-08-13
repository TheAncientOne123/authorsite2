import React from 'react';
import clsx from 'clsx';
import styles from './UniverseSelector.module.css';
import Link from '@docusaurus/Link';

const universes = [
  {
    title: 'El Orbe de los Destinos',
    description: 'Un reino amurallado por la historia y la magia, donde los destinos se entrelazan.',
    image: '/img/portadaLowQual.png',
    path: '/orbe/inicio',
  },
  {
    title: 'Crónicas de Sangre y Sombras',
    description: 'Oscuridad, sangre, deseo y una guerra secreta que cambiará la historia.',
    image: '/img/portadaNMLowQual.png',
    path: '/CrSaSo/inicio',
  },
  // Puedes añadir más universos aquí en el futuro
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
        {universes.map((universe, idx) => (

          <Link
           key={idx} 
           to={universe.path}
           className={clsx('text--center', styles.universeCard)}>
          
           
           <img src={universe.image} alt={universe.title} className={styles.universeImage} />
            <h3>{universe.title}</h3>
            <p>{universe.description}</p>
          </Link> 
        ))}
      </div>
    </section>
  );
}
