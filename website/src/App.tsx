import Navbar from './components/Navbar';
import Hero from './components/Hero';
import FeaturesBento from './components/FeaturesBento';
import AgentSection from './components/AgentSection';
import PerformanceSection from './components/PerformanceSection';
import SecuritySection from './components/SecuritySection';
import CTA from './components/CTA';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-void text-foreground">
      <Navbar />
      <main>
        <Hero />
        <FeaturesBento />
        <AgentSection />
        <PerformanceSection />
        <SecuritySection />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
