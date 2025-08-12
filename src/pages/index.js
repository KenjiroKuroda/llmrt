import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="hero hero--primary">
      <div className="container">
        <h1 className="hero__title">{siteConfig.title}</h1>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginTop: '2rem'}}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro">
            Get Started →
          </Link>
          <Link
            className="button button--primary button--lg"
            to="/playground/"
            target="_blank">
            🎮 Try Playground
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
      title={`${siteConfig.title} - Game Engine`}
      description="A tiny, dependency-free web runtime for JSON-based game cartridges">
      <HomepageHeader />
      <main>
        <div style={{padding: '4rem 0', textAlign: 'center'}}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <h3>🎮 Easy to Use</h3>
                <p>Create retro-style games with simple JSON configuration. No complex build process required.</p>
              </div>
              <div className="col col--4">
                <h3>⚡ Dependency-Free</h3>
                <p>Zero external dependencies for maximum compatibility and minimal bundle size.</p>
              </div>
              <div className="col col--4">
                <h3>🌐 Universal</h3>
                <p>Works everywhere the web works. Deploy to any static hosting service.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}