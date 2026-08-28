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
  return (
    <div id="top" className="min-h-screen bg-[#fcfbf9] text-[#171717] selection:bg-[#4338ca] selection:text-white">
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
        <GithubStats />
        <Benchmarks />
        <Downloads />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
