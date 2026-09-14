import { useEffect, useState, lazy, Suspense } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
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
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }

    // Hardware-accelerated 120 Hz Butter-Smooth Momentum Scroll
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let lenis: Lenis | null = null;
    let lenisRafId: number | null = null;

    if (!reduced) {
      lenis = new Lenis({
        duration: 1.15,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 1.0,
        touchMultiplier: 1.25,
      });
      window.__lenis = lenis;

      const raf = (time: number) => {
        lenis?.raf(time);
        lenisRafId = requestAnimationFrame(raf);
      };
      lenisRafId = requestAnimationFrame(raf);
    }

    let scrollTicking = false;
    let isScrollingTimer: ReturnType<typeof setTimeout> | null = null;
    let lastPastManifesto: boolean | null = null;

    const stopScrolling = () => {
      document.body.classList.remove('is-scrolling');
    };

    const updateScrollState = () => {
      const isPast = window.scrollY > window.innerHeight * 0.35;
      if (isPast !== lastPastManifesto) {
        lastPastManifesto = isPast;
        setShowNav(isPast);
        document.documentElement.classList.toggle('in-manifesto', !isPast);
      }
      scrollTicking = false;
    };

    const handleScroll = () => {
      if (!document.body.classList.contains('is-scrolling')) {
        document.body.classList.add('is-scrolling');
      }
      if (isScrollingTimer) clearTimeout(isScrollingTimer);
      isScrollingTimer = setTimeout(stopScrolling, 90);

      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scrollend', stopScrolling, { passive: true });

    return () => {
      if (lenisRafId) cancelAnimationFrame(lenisRafId);
      if (lenis) {
        lenis.destroy();
        window.__lenis = undefined;
      }
      if (isScrollingTimer) clearTimeout(isScrollingTimer);
      document.body.classList.remove('is-scrolling');
      document.documentElement.classList.remove('in-manifesto');
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scrollend', stopScrolling);
    };
  }, []);

  return (
    <div
      id="top"
      className="nova-page relative min-h-screen overflow-x-hidden selection:bg-[#4338ca] selection:text-white bg-[#0c0d12]"
    >
      {/* Floating Centered Kinetic SlideTabs Navbar */}
      <Navbar visible={showNav} />

      <ManifestoHero />

      <div
        className="relative w-full h-24 sm:h-36 -mt-1 pointer-events-none z-10 overflow-hidden bg-gradient-to-b from-[#171717] via-[#1a1c26] to-[#fcfbf9]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-500/20 via-sky-500/05 to-transparent" />
      </div>

      {/* Main Light Canvas Section */}
      <main id="main-content" className="relative z-10 bg-[#fcfbf9] pb-6">
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <Suspense fallback={<div className="min-h-[240px] flex items-center justify-center text-neutral-400 font-mono text-xs" />}>
          <GithubStats />
          <Benchmarks />
          <Downloads />
          <Faq />
        </Suspense>
      </main>

      {/* Deep Obsidian Sovereign Footer */}
      <Footer />
    </div>
  );
}
