import Navbar from './components/Navbar';
import ParallaxStarsHero from './components/ParallaxStarsHero';
import ContinuousTicker from './components/ContinuousTicker';
import MagicBentoGrid from './components/MagicBentoGrid';
import InteractiveAppShowcase from './components/InteractiveAppShowcase';
import StatisticsBenchmark from './components/StatisticsBenchmark';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-[#090A0F] text-slate-100 selection:bg-indigo-600 selection:text-white">
      <Navbar />
      <main>
        <ParallaxStarsHero speed={1} />
        <ContinuousTicker />
        <MagicBentoGrid />
        <InteractiveAppShowcase />
        <StatisticsBenchmark />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  );
}
