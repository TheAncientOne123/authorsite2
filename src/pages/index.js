import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
// Chat del lore: retirado de la portada por ahora (los componentes siguen en src/components/LoreChat).
// import LoreChatSection from '@site/src/components/LoreChat/LoreChatSection';
import WorkTimeline from '@site/src/components/WorkTimeline';
import BookStore from '@site/src/components/BookStoreFeatures/BookStore.jsx';
import useBaseUrl from '@docusaurus/useBaseUrl';
import useCodiceData from '@site/src/data/useCodiceData';

import Heading from '@theme/Heading';
import styles from './index.module.css';

/** Textos de la portada cuando el sitio se construye sin datos del admin. */
const LEGACY_ABOUT = {
  title: 'Sobre el autor',
  image: '/img/flavicon/logoDark.png',
  paragraphs: [
    'Soy Héctor Sánchez, un autor apasionado por la creación de mundos fantásticos e historias épicas. Aunque soy relativamente nuevo en la escritura, siento una pasión innata por crear historias que transporten a los lectores a universos ricos en detalles y emociones.',
    'En este sitio encontrarás un compendio de mis obras, personajes y el vasto universo que he creado. Mi objetivo es compartir mi amor por la narrativa y ofrecer a los lectores una experiencia inmersiva en cada historia.',
    'Mi misión es que cada historia deje una emoción persistente, con preguntas nuevas y un deseo de volver y seguir explorando.',
  ],
};

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  const hero = useCodiceData()?.site.hero;
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to={hero?.buttonHref || '/universes'}>
            {hero?.buttonLabel || 'Entrar'}
          </Link>
        </div>
      </div>
    </header>
  );
}

function AboutAuthor() {
  const about = useCodiceData()?.site.about ?? LEGACY_ABOUT;
  const image = useBaseUrl(about.image || LEGACY_ABOUT.image);
  return (
    <section className={clsx('container', styles.aboutAuthor)}>
      <div className="row">
        <div className="col col--8 col--offset-2 text--center">
          <Heading as="h2">{about.title}</Heading>
          {about.image ? <img src={image} alt="Logo" className={styles.authorImage} /> : null}
          {about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <Layout
      title="Inicio"
      description="El Códice: compendio de fantasía de Héctor Sánchez — personajes, lugares, eventos y sagas como Crónicas de Sangre y Sombra y El Orbe de los Destinos.">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <WorkTimeline />
        <AboutAuthor />
        <BookStore />
      </main>
    </Layout>
  );
}
