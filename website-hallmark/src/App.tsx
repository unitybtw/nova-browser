import Navbar from './components/Navbar';
import Hero from './components/Hero';
import WebGpuTerminal from './components/WebGpuTerminal';
import Architecture from './components/Architecture';
import Benchmarks from './components/Benchmarks';
import McpProtocol from './components/McpProtocol';
import SecurityAudit from './components/SecurityAudit';
import Downloads from './components/Downloads';
import Faq from './components/Faq';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-[#0b0d13] text-[#f4f4f6] selection:bg-[#4338ca] selection:text-white">
      <Navbar />
      <main id="main-content">
        <Hero />
        <WebGpuTerminal />
        <Architecture />
        <Benchmarks />
        <McpProtocol />
        <SecurityAudit />
        <Downloads />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
