import Navbar from './components/Navbar';
import Hero from './components/Hero';
import ProductTour from './components/ProductTour';
import WorkGrid from './components/WorkGrid';
import CapabilitiesAccordion from './components/CapabilitiesAccordion';
import PerformanceBenchmark from './components/PerformanceBenchmark';
import DownloadSection from './components/DownloadSection';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-[#fcfbf9] text-[#171717] selection:bg-[#4338ca] selection:text-white">
      <Navbar />
      <main>
        <Hero />
        <ProductTour />
        <WorkGrid />
        <CapabilitiesAccordion />
        <PerformanceBenchmark />
        <DownloadSection />
      </main>
      <Footer />
    </div>
  );
}
