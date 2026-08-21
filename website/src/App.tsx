import { lazy, Suspense, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AutonomousAgentSection } from './components/AutonomousAgentSection';
import { Features } from './components/Features';
import { ThemeStudio } from './components/ThemeStudio';
import { SyncShowcase } from './components/SyncShowcase';

const Comparison = lazy(() => import('./components/Comparison').then(m => ({ default: m.Comparison })));
const FAQ = lazy(() => import('./components/FAQ').then(m => ({ default: m.FAQ })));
const CTA = lazy(() => import('./components/CTA').then(m => ({ default: m.CTA })));
const Footer = lazy(() => import('./components/Footer').then(m => ({ default: m.Footer })));

function App() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-cyan-500/30 selection:text-cyan-300">
      <Navbar />

      <main>
        {/* 1. Hero — First impression with high-res screenshot switcher */}
        <Hero />

        {/* 2. Autonomous Agent & MCP Spotlight — The core AI capability */}
        <AutonomousAgentSection />

        {/* 3. Features — Bento Grid Architecture */}
        <Features />

        {/* 4. Theme & Customizer Studio — Realtime theme & accent preview */}
        <ThemeStudio />

        {/* 5. Zero-Knowledge Cloud Sync — 1-Click pairing chain */}
        <SyncShowcase />

        {/* 6. Comparison Table & FAQ, lazy-loaded */}
        <Suspense fallback={null}>
          <Comparison />
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
