import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useCodiceData from '@site/src/data/useCodiceData';

const FeatureList = [
  {
    title: 'Explora el Universo',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/landing-page/universo',
    description: (
      <>
        Sumérgete en los mundos, ciudades, razas y secretos que habitan mis historias.
        Desde mapas interactivos hasta descripciones detalladas, cada rincón de mi universo está a tu alcance.
      </>
    ),
  },
  {
    title: 'Conoce a los personajes',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/landing-page/personajes',
    description: (
      <>
        Cada historia está marcada por las decisiones de sus protagonistas.
        Aquí encontrarás biografías, relaciones, líneas del tiempo, relaciones y secretos de los personajes que dan vida a mis libros.
      </>
    ),
  },
  {
    title: 'Accede a los libros',
    image: 'https://res.cloudinary.com/dtntllea5/image/upload/f_auto,q_auto/v1/authorsite/landing-page/libros',
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
        <img src={useBaseUrl(image)} className={styles.featureImage} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  // Con datos del admin, las tarjetas vienen de la página «Portada».
  const fromAdmin = useCodiceData()?.site.features;
  const features = fromAdmin?.length ? fromAdmin : FeatureList;
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
