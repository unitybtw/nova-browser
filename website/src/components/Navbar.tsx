import React, { useState, useEffect } from 'react';
import { ArrowUpRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 h-20 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        scrolled ? 'backdrop-blur-xl bg-[#090A0F]/80 border-b border-white/10' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-6 md:px-12 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <a href="#top" className="flex items-center gap-2.5 group cursor-pointer">
          <img
            src="/nova-icon-transparent.png"
            alt="Nova Logo"
            className="w-7 h-7 object-contain transition-transform duration-500 group-hover:rotate-12"
          />
          <span className="font-sans font-bold text-xl tracking-tight text-white">
            Nova <span className="text-indigo-400 font-light text-sm font-mono">// Browser</span>
          </span>
        </a>

        {/* Center: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'DISCOVERY', href: '#ticker' },
            { label: 'ARCHITECTURE', href: '#features' },
            { label: 'SIMULATION', href: '#simulator' },
            { label: 'METRICS', href: '#benchmarks' },
            { label: 'SOURCE', href: 'https://github.com/unitybtw/nova-browser', external: true },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className="group relative font-mono text-[11px] uppercase tracking-widest text-slate-300 hover:text-white transition-colors py-1"
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-indigo-400 transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right: System Status & Download CTA */}
        <div className="flex items-center gap-4">
          <a
            href="#download"
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white text-white hover:text-[#090A0F] text-xs font-medium transition-all duration-300 shadow-sm group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">
              System Online
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
