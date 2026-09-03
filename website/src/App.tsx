import { useEffect, useState } from 'react';
import ManifestoHero from './components/ManifestoHero';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TrustPillars from './components/TrustPillars';
import FeatureBento from './components/FeatureBento';
import GithubStats from './components/GithubStats';
import Benchmarks from './components/Benchmarks';
import Downloads from './components/Downloads';
import Faq from './components/Faq';
import Footer from './components/Footer';

export default function App() {
  const [showNav, setShowNav] = useState(false);

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }

    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }

    let scrollTicking = false;
    const updateScrollState = () => {
      const isPastManifesto = window.scrollY > window.innerHeight * 0.35;
      setShowNav(isPastManifesto);
      if (isPastManifesto) {
        document.documentElement.classList.remove('in-manifesto');
      } else {
        document.documentElement.classList.add('in-manifesto');
      }
      scrollTicking = false;
    };

    const handleScroll = () => {
      if (!scrollTicking) {
        scrollTicking = true;
        requestAnimationFrame(updateScrollState);
      }
    };

    updateScrollState();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      document.documentElement.classList.remove('in-manifesto');
      window.removeEventListener('scroll', handleScroll);
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

      {/* Main Light Canvas Section with static imports for zero CLS */}
      <main id="main-content" className="relative z-10 bg-[#fcfbf9] pb-6">
        <Hero />
        <TrustPillars />
        <FeatureBento />
        <GithubStats />
        <Benchmarks />
        <Downloads />
        <Faq />
      </main>

      {/* Deep Obsidian Sovereign Footer */}
      <Footer />
    </div>
  );
}
