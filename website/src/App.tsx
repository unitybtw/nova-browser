import { lazy, Suspense, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { ThemeStudio } from './components/ThemeStudio';
import { SyncShowcase } from './components/SyncShowcase';

const FeatureShowcase = lazy(() => import('./components/FeatureShowcase').then(m => ({ default: m.FeatureShowcase })));
const Comparison = lazy(() => import('./components/Comparison').then(m => ({ default: m.Comparison })));
const Testimonials = lazy(() => import('./components/Testimonials').then(m => ({ default: m.Testimonials })));
const TrustAndChangelog = lazy(() => import('./components/TrustAndChangelog').then(m => ({ default: m.TrustAndChangelog })));
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })));
const CTA = lazy(() => import('./components/CTA').then(m => ({ default: m.CTA })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));

function App() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 selection:text-primary">
      <Navbar />

      <main>
        {/* 1. Hero — First impression with multi-view screenshot switcher & sandbox */}
        <Hero />

        {/* 2. Stats — Community & Open Source proof numbers */}
        <Stats />

        {/* 3. Features — Bento Grid Architecture */}
        <Features />

        {/* 4. Theme & Customization Studio — Interactive theme & accent customizer */}
        <ThemeStudio />

        {/* 5. Zero-Knowledge Cloud Sync — Interactive pairing chain showcase */}
        <SyncShowcase />

        {/* 6+ Deep Dive Feature Showcase & Comparison, lazy-loaded */}
        <Suspense fallback={null}>
          <FeatureShowcase />
          <Comparison />
          <Testimonials />
          <TrustAndChangelog />
          <FAQ />
          <CTA />
        </Suspense>
      </main>

      <Suspense fallback={null}>
        <Footer />
      </Suspense>
    </div>
  );
}

export default App;
