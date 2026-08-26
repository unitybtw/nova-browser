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
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-[#e5e5e5]' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-4 flex justify-between items-center">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2 group cursor-pointer">
          <img
            src="/nova-icon-transparent.png"
            alt="Nova Logo"
            className="w-7 h-7 object-contain transition-transform duration-500 group-hover:rotate-12"
          />
          <span className="font-serif italic text-2xl font-bold tracking-tight text-[#171717]">
            Nova
          </span>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase">
          {[
            { label: 'MANIFESTO', href: '#top' },
            { label: 'SPECS', href: '#features' },
            { label: 'BENCHMARKS', href: '#benchmarks' },
            { label: 'SOURCE', href: 'https://github.com/unitybtw/nova-browser', external: true },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className="text-[#171717]/70 hover:text-[#4338ca] transition-colors py-1 border-b border-transparent hover:border-[#4338ca]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Status Pill & CTA */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#e5e5e5] bg-white/70 font-mono text-[11px] text-neutral-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 status-dot" />
            <span>System Online</span>
          </div>

          <a
            href="#download"
            className="font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-6 py-2.5 rounded-lg hover:bg-[#4338ca] transition-colors duration-300 flex items-center gap-2"
          >
            <span>Get Nova</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
