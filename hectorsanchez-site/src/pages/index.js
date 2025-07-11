import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import Heading from '@theme/Heading';
import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Entrar
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`Inicio`}
      description="Description will go into a meta tag in <head />">
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <section className ="container margin-vert--lg">
          <div className="row">
            <div className = "col col--8 col--offset-2 text--center">
              <Heading as="h2">Sobre el autor</Heading>
              <img src = "/img/logoDark.png" alt="Logo" style = {{ width: '150px', borderRadius: '50%', marginBottom: '1rem' }} />
              <p>
                Soy Héctor Sánchez, un autor apasionado por la creación de mundos fantásticos e historias épicas. 
                Aunque soy relativamente nuevo en la escritura, siento una pasión innata 
                por crear historias que transporten a los lectores a universos ricos en detalles y emociones.
              </p>
              <p>
                En este sitio encontrarás un compendio de mis obras, personajes y el vasto universo que he creado. 
                Mi objetivo es compartir mi amor por la narrativa y ofrecer a los lectores una experiencia inmersiva 
                en cada historia.
              </p>
              <p> 
                Mi misión es que cada historia deje una emoción persistente, con preguntas nuevas y un deseo de volver y seguir explorando.
              </p>
            </div>
          </div>
        </section>
        
        <section className="container margin-vert--lg">
          <div className="row">
            <div className = "col col--8 col--offset-2 text--center">
              <Heading as="h2">Adquiere mis libros</Heading>
            </div>
            <div className="row" style={{justifyContent: 'center', gap: '2rem', marginTop: '2rem'}}>
              <div className="col col--3 text--center">
                <a href = "https://www.amazon.com.mx/ORBE-DESTINOS-REINO-LUDRIAN-Spanish/dp/B0D9NH2DS5" target="_blank" rel="noopener noreferrer">
                  <img src="/img/portadaLowQual.png" alt="El Orbe de los Destinos 1" style={{ width: '100%', borderRadius: '8px' }}/>
                  <button className="button button--primary button--block margin-top--sm">Comprar</button>
                </a>
              </div>
          </div>
        </div>
        </section>
      </main>
    </Layout>
  );
}
