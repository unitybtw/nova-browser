import Nav from './components/Nav';
import Hero from './components/Hero';
import EngineConsole from './components/EngineConsole';
import Blueprint from './components/Blueprint';
import Performance from './components/Performance';
import McpBridge from './components/McpBridge';
import Security from './components/Security';
import Downloads from './components/Downloads';
import Faq from './components/Faq';
import Footer from './components/Footer';

export default function App() {
  return (
    <div id="top" className="min-h-screen bg-[#0d0f17] text-[#f1f3f9]">
      <Nav />
      <main id="main-content">
        <Hero />
        <EngineConsole />
        <Blueprint />
        <Performance />
        <McpBridge />
        <Security />
        <Downloads />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
