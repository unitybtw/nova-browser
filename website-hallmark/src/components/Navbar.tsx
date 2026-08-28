import React, { useEffect, useState } from 'react';
import { Download, Github, Menu, X, ArrowUpRight } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [osName, setOsName] = useState<'mac' | 'windows' | 'linux'>('mac');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setOsName('windows');
    else if (ua.includes('linux')) setOsName('linux');
    else setOsName('mac');
  }, []);

  const navLinks = [
    { label: 'ENGINE', href: '#engine' },
    { label: 'ARCHITECTURE', href: '#architecture' },
    { label: 'BENCHMARKS', href: '#benchmarks' },
    { label: 'MCP PROTOCOL', href: '#mcp' },
    { label: 'SECURITY', href: '#security' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
      <div className="w-full max-w-6xl mx-auto flex items-center justify-between pointer-events-auto">
        {/* Island 1: Brand & Status Pill */}
        <a
          href="#top"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-[#131620]/90 border border-[#24293d] backdrop-blur-md shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          <img src="/nova-logo-tight.png" alt="Nova" className="w-6 h-6 object-contain" />
          <span className="font-display font-extrabold text-sm tracking-tight text-white">Nova</span>
          <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-[9px] font-mono font-bold text-indigo-400">
            v1.1.0
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </a>

        {/* Island 2: Desktop Navigation Links */}
        <nav
          className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-[#131620]/90 border border-[#24293d] backdrop-blur-md shadow-lg font-mono text-xs font-semibold"
          aria-label="Primary Navigation"
        >
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
          >
            <Github className="w-3.5 h-3.5" />
            <span>SOURCE</span>
          </a>
        </nav>

        {/* Island 3: Download CTA & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <a
            href="#download"
            className="tech-button px-5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_4px_20px_rgba(79,70,229,0.35)] border border-indigo-400/40 gap-2 flex items-center text-xs font-bold font-mono uppercase tracking-wider"
          >
            <Download className="w-4 h-4" />
            <span>
              {osName === 'mac' ? 'GET FOR MAC' : osName === 'windows' ? 'GET FOR WINDOWS' : 'GET FOR LINUX'}
            </span>
          </a>

          {/* Mobile Menu Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle Navigation Menu"
            className="lg:hidden p-2.5 rounded-2xl bg-[#131620]/90 border border-[#24293d] text-slate-200 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Panel */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-full left-4 right-4 mt-2 p-4 rounded-2xl bg-[#131620] border border-[#24293d] shadow-2xl z-50 pointer-events-auto space-y-2 font-mono text-xs">
          {navLinks.map((item) => (
            <a
              key={item.label}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2.5 rounded-xl text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
            >
              {item.label}
            </a>
          ))}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between px-4 py-2.5 rounded-xl text-slate-200 hover:bg-white/5 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>GITHUB REPOSITORY</span>
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </a>
        </div>
      )}
    </header>
  );
};

export default Navbar;
