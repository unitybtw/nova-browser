import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import ManifestoHero from './components/ManifestoHero';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustPillars from './components/TrustPillars';
import FeatureBento from './components/FeatureBento';
import Footer from './components/Footer';
import ScrollProgress from './components/ScrollProgress';

const GithubStats = lazy(() => import('./components/GithubStats'));
const Benchmarks = lazy(() => import('./components/Benchmarks'));
const Downloads = lazy(() => import('./components/Downloads'));
const Faq = lazy(() => import('./components/Faq'));
const DEFERRED_SECTION_IDS = new Set(['community', 'benchmarks', 'download', 'faq']);

function DeferredContent() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto min-h-[32rem] max-w-7xl" aria-hidden="true" />
      }
    >
      <GithubStats />
      <Benchmarks />
      <Downloads />
      <Faq />
    </Suspense>
  );
}

function DeferredSections() {
  const deferredSectionsRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const loadSections = () => setShouldLoad(true);

    const handleHashChange = () => {
      const hashTarget = window.location.hash.slice(1);
      if (!DEFERRED_SECTION_IDS.has(hashTarget)) return;

      loadSections();
      requestAnimationFrame(() => {
        document.getElementById(hashTarget)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };
    window.addEventListener('hashchange', handleHashChange);

    const deferredSections = deferredSectionsRef.current;
    if (!deferredSections || !('IntersectionObserver' in window)) {
      loadSections();
      return () => window.removeEventListener('hashchange', handleHashChange);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadSections();
          observer.disconnect();
        }
      },
      { rootMargin: '800px 0px' },
    );
    observer.observe(deferredSections);

    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <div ref={deferredSectionsRef}>
      {shouldLoad ? (
        <DeferredContent />
      ) : (
        <div className="mx-auto min-h-[32rem] max-w-7xl" aria-hidden="true" />
      )}
    </div>
  );
}

export default function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    // Prevent browser auto-scroll jump on refresh so page stays at top
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    const resetTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      if (window.location.hash) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    };

    resetTop();
    requestAnimationFrame(resetTop);
    const t1 = setTimeout(resetTop, 60);
    const t2 = setTimeout(resetTop, 250);
    window.addEventListener('pageshow', resetTop);

    const handleScroll = () => {
      const isPastManifesto = window.scrollY > window.innerHeight * 0.35;
      setShowNavbar(isPastManifesto);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('pageshow', resetTop);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div id="top" className="nova-page relative min-h-screen overflow-x-hidden selection:bg-[#4338ca] selection:text-white">
      <ScrollProgress />

      {/* Floating Animated Navbar - Hidden on Manifesto, Slides down on scroll */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showNavbar
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <Navbar />
      </div>

      {/* 00 Fullscreen Kinetic Manifesto Hero Opening */}
      <ManifestoHero />

      {/* Main Website Flow */}
      <main id="main-content">
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <DeferredSections />
      </main>
      <Footer />
    </div>
  );
}
