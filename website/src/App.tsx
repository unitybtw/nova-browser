import React from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { AutonomousAgentSection } from './components/AutonomousAgentSection';
import { PerformanceSection } from './components/PerformanceSection';
import { SecuritySection } from './components/SecuritySection';
import { FeaturesBento } from './components/FeaturesBento';
import { CTA } from './components/CTA';
import { Footer } from './components/Footer';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#050608] text-[#f8fafc] font-sans">
      <Navbar />
      <main>
        {/* 1. Hero with Authentic Live Interactive Nova Browser */}
        <Hero />

        {/* 2. Model Context Protocol (MCP) & Autonomous AI Navigation Spotlight */}
        <AutonomousAgentSection />

        {/* 3. Real Performance Benchmarks: RAM, Speed, Battery */}
        <PerformanceSection />

        {/* 4. Zero-Knowledge E2EE & Privacy Shield */}
        <SecuritySection />

        {/* 5. Features Bento: Chrome Extensions, Split View, Workspaces */}
        <FeaturesBento />

        {/* 6. Download CTA */}
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default App;
