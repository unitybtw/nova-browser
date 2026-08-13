import { useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Stats } from './components/Stats';
import { Features } from './components/Features';
import { FeatureShowcase } from './components/FeatureShowcase';
import { Comparison } from './components/Comparison';
import { Testimonials } from './components/Testimonials';
import { TrustAndChangelog } from './components/TrustAndChangelog';
import { FAQ } from './components/FAQ';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

function App() {
  useEffect(() => {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    window.scrollTo(0, 0);
    const id = setTimeout(() => window.scrollTo(0, 0), 100);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/30 selection:text-primary">
      <Navbar />

      <main>
        {/* 1. Hero — first impression */}
        <Hero />

        {/* 2. Stats — social proof numbers */}
        <Stats />

        {/* 3. Feature grid — quick overview */}
        <Features />

        {/* 4. Feature showcase — deep dive alternating sections */}
        <FeatureShowcase />

        {/* 5. Comparison — vs Chrome/Firefox/Brave */}
        <Comparison />

        {/* 6. Testimonials — user reviews */}
        <Testimonials />

        {/* 7. Trust badges + Changelog */}
        <TrustAndChangelog />

        {/* 8. FAQ */}
        <FAQ />

        {/* 9. CTA — download call to action */}
        <CTA />
      </main>

      <Footer />
    </div>
  );
}

export default App;
