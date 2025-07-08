import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Explora el Universo',
    image: '/img/universo.png',
    description: (
      <>
        Sumérgete en los mundos, ciudades, razas y secretos que habitan mis historias.
        Desde mapas interactivos hasta descripciones detalladas, cada rincón de mi universo está a tu alcance.
      </>
    ),
  },
  {
    title: 'Conoce a los personajes',
    image: '/img/personajes.png',
    description: (
      <>
        Cada historia está marcada por las decisiones de sus protagonistas.
        Aquí encontrarás biografías, relaciones, líneas del tiempo, relaciones y secretos de los personajes que dan vida a mis libros.
      </>
    ),
  },
  {
    title: 'Accede a los libros',
    image: '/img/libros.png',
    description: (
      <>
        Descubre mis obras publicadas, orden de lectura, datos curiosos, inspiraciones y más.
      </>
    ),
  },
];

function Feature({image, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} className={styles.featureImage} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
