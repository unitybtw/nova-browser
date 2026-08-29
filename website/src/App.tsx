import { lazy, Suspense, useEffect, useState } from 'react';
import ManifestoHero from './components/ManifestoHero';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustPillars from './components/TrustPillars';
import FeatureBento from './components/FeatureBento';
import Footer from './components/Footer';

const GithubStats = lazy(() => import('./components/GithubStats'));
const Benchmarks = lazy(() => import('./components/Benchmarks'));
const Downloads = lazy(() => import('./components/Downloads'));
const Faq = lazy(() => import('./components/Faq'));

// Height-stable placeholder — overflowAnchor:'none' stops Chrome scroll anchoring
// from adjusting viewport position when deferred content loads and replaces this div.
function SectionPlaceholder({ height }: { height: string }) {
  return <div style={{ minHeight: height, overflowAnchor: 'none' }} aria-hidden="true" />;
}

export default function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Force top position immediately on mount
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });

    // Multi-frame lock covering React hydration and WebGL canvas init
    const rafId1 = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      const rafId2 = requestAnimationFrame(() => {
        if (window.scrollY !== 0) {
          window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
        }
      });
      return () => cancelAnimationFrame(rafId2);
    });

    // bfcache guard
    const onPageShow = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
    };
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('load', onPageShow);

    const handleScroll = () => {
      const isPastManifesto = window.scrollY > window.innerHeight * 0.35;
      setShowNavbar(isPastManifesto);
      if (isPastManifesto) {
        document.documentElement.classList.remove('in-manifesto');
      } else {
        document.documentElement.classList.add('in-manifesto');
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(rafId1);
      document.documentElement.classList.remove('in-manifesto');
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('load', onPageShow);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div
      id="top"
      className="nova-page relative min-h-screen overflow-x-hidden selection:bg-[#4338ca] selection:text-white bg-[#0c0d12]"
      style={{ overflowAnchor: 'none' }}
    >
      <Navbar visible={showNavbar} />
      <ManifestoHero />

      <div
        className="relative w-full h-24 sm:h-36 -mt-1 pointer-events-none z-10 overflow-hidden bg-gradient-to-b from-[#171717] via-[#1a1c26] to-[#fcfbf9]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-sky-500/05 to-transparent" />
      </div>

      {/* Main Light Canvas Section */}
      <main id="main-content" className="relative z-10 bg-[#fcfbf9] pb-6" style={{ overflowAnchor: 'none' }}>
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <Suspense fallback={<SectionPlaceholder height="700px" />}>
          <GithubStats />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder height="600px" />}>
          <Benchmarks />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder height="500px" />}>
          <Downloads />
        </Suspense>
        <Suspense fallback={<SectionPlaceholder height="600px" />}>
          <Faq />
        </Suspense>
      </main>

      {/* Deep Obsidian Sovereign Footer */}
      <Footer />
    </div>
  );
}
