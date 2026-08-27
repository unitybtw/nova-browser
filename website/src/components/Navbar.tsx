import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, Github, Star } from 'lucide-react';

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const NAV_ITEMS = [
    { label: 'MANIFESTO', href: '#top' },
    { label: 'FEATURES', href: '#features' },
    { label: 'BENCHMARKS', href: '#benchmarks' },
    { label: 'SOURCE', href: 'https://github.com/unitybtw/nova-browser', external: true },
  ];

  return (
    <header className="fixed top-4 sm:top-6 left-0 right-0 z-50 px-4 sm:px-6 flex justify-center pointer-events-none">
      <nav
        className={`pointer-events-auto w-full max-w-5xl rounded-full transition-all duration-300 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 bg-white border border-[#e5e5e5] ${
          scrolled
            ? 'shadow-md border-neutral-300 py-2 sm:py-2.5'
            : 'shadow-xs'
        }`}
      >
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2.5 group cursor-pointer shrink-0">
          <img
            src="/nova-logo-tight.png"
            alt="Nova Logo"
            className="w-7 h-7 sm:w-8 sm:h-8 object-contain transition-transform duration-500 group-hover:scale-110"
          />
          <span className="font-display text-xl sm:text-2xl font-black tracking-tight text-[#171717]">
            Nova
          </span>
        </a>

        {/* Navigation Links with Smooth Sliding Pill Hover */}
        <div
          onMouseLeave={() => setHoveredNav(null)}
          className="hidden md:flex items-center gap-1 font-mono text-xs tracking-wider uppercase font-semibold relative"
        >
          {NAV_ITEMS.map((item) => {
            const isHovered = hoveredNav === item.label;
            return (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onMouseEnter={() => setHoveredNav(item.label)}
                className="relative px-4 py-2 text-neutral-600 hover:text-neutral-900 transition-colors duration-200 z-10"
              >
                {item.label}
                {isHovered && (
                  <motion.div
                    layoutId="nav-sliding-pill"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="absolute inset-0 bg-neutral-200/60 rounded-full -z-10"
                  />
                )}
              </a>
            );
          })}
        </div>

        {/* Right Actions: GitHub Repo & Download CTA */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          {/* GitHub Star Pill */}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-100/80 hover:bg-neutral-200/80 border border-neutral-200/70 text-neutral-700 hover:text-black font-mono text-xs font-semibold transition-all duration-200 cursor-pointer shadow-xs active:scale-95"
            title="Star Nova on GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
            <span className="w-1 h-1 rounded-full bg-neutral-300 mx-0.5" />
            <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
          </a>

          {/* Primary CTA Button */}
          <a
            href="#download"
            className="font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-4 sm:px-5 py-2 rounded-full hover:bg-[#4338ca] transition-all duration-300 flex items-center gap-1.5 font-bold shadow-md hover:shadow-lg active:scale-95"
          >
            <span>Get Nova</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
