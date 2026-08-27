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
        <a href="#top" className="flex items-center gap-2.5 group cursor-pointer">
          <img
            src="/nova-logo-tight.png"
            alt="Nova Logo"
            className="w-8 h-8 object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#171717]">
            Nova
          </span>
        </a>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs tracking-widest uppercase font-medium">
          {[
            { label: 'MANIFESTO', href: '#top' },
            { label: 'FEATURES', href: '#features' },
            { label: 'BENCHMARKS', href: '#benchmarks' },
            { label: 'SOURCE', href: 'https://github.com/unitybtw/nova-browser', external: true },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.external ? '_blank' : undefined}
              rel={item.external ? 'noopener noreferrer' : undefined}
              className="text-[#171717]/75 hover:text-[#4338ca] transition-colors py-1 border-b border-transparent hover:border-[#4338ca]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <a
            href="#download"
            className="font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-6 py-2.5 rounded-xl hover:bg-[#4338ca] transition-all duration-300 flex items-center gap-2 font-semibold shadow-md active:scale-[0.98]"
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
