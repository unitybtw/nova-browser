import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import IntroSplash from './components/IntroSplash';
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

function DeferredContentReady() {
  useEffect(() => {
    const hashTarget = window.location.hash.slice(1);
    if (!DEFERRED_SECTION_IDS.has(hashTarget)) return;

    requestAnimationFrame(() => {
      document.getElementById(hashTarget)?.scrollIntoView({ block: 'start' });
    });
  }, []);

  return null;
}

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
      <DeferredContentReady />
    </Suspense>
  );
}

function DeferredSections() {
  const deferredSectionsRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    const loadSections = () => setShouldLoad(true);

    if (DEFERRED_SECTION_IDS.has(window.location.hash.slice(1))) {
      loadSections();
    }

    const handleHashChange = () => {
      const hashTarget = window.location.hash.slice(1);
      if (!DEFERRED_SECTION_IDS.has(hashTarget)) return;

      loadSections();
      requestAnimationFrame(() => {
        document.getElementById(hashTarget)?.scrollIntoView({ block: 'start' });
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
      { rootMargin: '1200px 0px' },
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
  return (
    <div id="top" className="nova-page relative min-h-screen overflow-x-hidden selection:bg-[#4338ca] selection:text-white">
      <IntroSplash />
      <ScrollProgress />
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-[#171717] px-4 py-2 text-sm font-semibold text-white focus:not-sr-only"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <DeferredSections />
      </main>
      <Footer />
    </div>
  );
}
