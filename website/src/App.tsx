import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeatureBento from './components/FeatureBento';
import Benchmarks from './components/Benchmarks';
import Downloads from './components/Downloads';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-[#fcfbf9] text-[#171717] selection:bg-[#4338ca] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <FeatureBento />
        <Benchmarks />
        <Downloads />
      </main>
      <Footer />
    </div>
  );
}
