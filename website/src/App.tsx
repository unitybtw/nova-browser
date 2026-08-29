import { lazy, Suspense, useEffect, useRef, useState } from 'react';
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

export default function App() {
  const [showNavbar, setShowNavbar] = useState(false);

  useEffect(() => {
    // Lock scroll to top once synchronously on mount.
    // The <head> script already set scrollRestoration=manual and scrollTo(0,0),
    // this is a safety net for the React hydration frame.
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    // Single rAF scroll-lock — runs after the first paint, before user sees anything.
    // Do NOT chain multiple timeouts; they fight each other and cause visible jumps.
    const rafId = requestAnimationFrame(() => {
      if (window.scrollY !== 0) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
      // Only strip hash if it does NOT refer to a real section (prevents removing
      // intentional deep links while still killing stale restoration hashes).
      if (window.location.hash) {
        const targetId = window.location.hash.slice(1);
        const el = document.getElementById(targetId);
        if (!el) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    // Restore-scroll guard on bfcache hits (back-forward navigation).
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
      }
    };
    window.addEventListener('pageshow', onPageShow);

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
      cancelAnimationFrame(rafId);
      document.documentElement.classList.remove('in-manifesto');
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <div id="top" className="nova-page relative min-h-screen overflow-x-hidden selection:bg-[#4338ca] selection:text-white">
      {/* Floating Left-Side Sovereign Navigation Dock - Slides in when scrolling past Manifesto */}
      <Navbar visible={showNavbar} />

      {/* 00 Fullscreen Kinetic Manifesto Hero Opening */}
      <ManifestoHero />

      {/* Seamless Atmosphere Color Transition Seam: Dark Manifesto -> Light Canvas */}
      <div
        className="relative w-full h-24 sm:h-36 -mt-1 pointer-events-none z-10 overflow-hidden bg-gradient-to-b from-[#171717] via-[#1a1c26] to-[#fcfbf9]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-sky-500/05 to-transparent" />
      </div>

      {/* Main Website Flow */}
      <main id="main-content">
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <Suspense
          fallback={
            <div className="min-h-[3200px]" aria-hidden="true" />
          }
        >
          <GithubStats />
          <Benchmarks />
          <Downloads />
          <Faq />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
