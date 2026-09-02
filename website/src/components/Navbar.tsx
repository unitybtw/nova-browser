import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Menu, X, Download, Github, ChevronRight } from 'lucide-react';

export interface NavbarProps {
  visible?: boolean;
}

const NAV_TABS = [
  { label: 'Manifesto', href: '#top' },
  { label: 'Features', href: '#features' },
  { label: 'Community', href: '#community' },
  { label: 'Benchmarks', href: '#benchmarks' },
  { label: 'Download', href: '#download' },
  { label: 'FAQ', href: '#faq' },
];

export const Navbar: React.FC<NavbarProps> = ({ visible = true }) => {
  const prefersReducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [position, setPosition] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });
  const [selected, setSelected] = useState(0);
  const tabsRef = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const selectedTab = tabsRef.current[selected];
    if (selectedTab) {
      setPosition({
        left: selectedTab.offsetLeft,
        width: selectedTab.offsetWidth,
        opacity: 1,
      });
    }
  }, [selected]);

  // Recalculate on window resize
  useEffect(() => {
    const handleResize = () => {
      const selectedTab = tabsRef.current[selected];
      if (selectedTab) {
        setPosition({
          left: selectedTab.offsetLeft,
          width: selectedTab.offsetWidth,
          opacity: 1,
        });
      }
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selected]);

  // ScrollSpy to update active tab when scrolling through sections
  useEffect(() => {
    const sectionIds = ['manifesto', 'features', 'community', 'benchmarks', 'download', 'faq'];
    let ticking = false;

    const updateActiveTab = () => {
      const scrollY = window.scrollY;
      if (scrollY < 240) {
        setSelected(0);
        ticking = false;
        return;
      }

      const scrollPos = scrollY + 200;
      for (let i = 1; i < sectionIds.length; i++) {
        const el = document.getElementById(sectionIds[i]);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setSelected(i);
            break;
          }
        }
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActiveTab);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabClick = (index: number, href: string) => {
    setSelected(index);
    setMobileMenuOpen(false);
    const targetId = href.slice(1);
    if (targetId === 'top' || targetId === 'manifesto') {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
      }
    }
  };

  return (
    <>
      {/* 1. DESKTOP FLOATING SLIDETABS DOCK (md: and up) */}
      <header
        className={`hidden md:flex fixed top-6 left-1/2 -translate-x-1/2 z-50 items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
        }`}
      >
        <div className="pointer-events-auto">
          <ul
            onMouseLeave={() => {
              const selectedTab = tabsRef.current[selected];
              if (selectedTab) {
                setPosition({
                  left: selectedTab.offsetLeft,
                  width: selectedTab.offsetWidth,
                  opacity: 1,
                });
              }
            }}
            className="relative mx-auto flex w-fit items-center rounded-full border-2 border-black bg-white p-1 shadow-2xl dark:border-white dark:bg-neutral-800"
          >
            {NAV_TABS.map((tab, i) => (
              <Tab
                key={tab.label}
                ref={(el) => {
                  tabsRef.current[i] = el;
                }}
                setPosition={setPosition}
                onClick={() => handleTabClick(i, tab.href)}
              >
                {tab.label}
              </Tab>
            ))}

            <Cursor position={position} />
          </ul>
        </div>
      </header>

      {/* 2. DEDICATED MOBILE HEADER & DRAWER (< md:) */}
      <header
        className={`md:hidden fixed top-3 inset-x-3 z-50 pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          visible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
        }`}
      >
        {/* Mobile Top Pill */}
        <div className="pointer-events-auto flex items-center justify-between px-4 py-2.5 rounded-2xl bg-[#0c0d12]/92 border border-white/15 backdrop-blur-md shadow-2xl text-white">
          {/* Logo & Brand */}
          <button
            type="button"
            onClick={() => handleTabClick(0, '#top')}
            className="flex items-center gap-2.5 focus:outline-none cursor-pointer"
          >
            <img src="/logo.svg" alt="Nova" className="h-6 w-6 object-contain" />
            <span className="font-display font-extrabold text-base tracking-tight text-white">
              Nova
            </span>
          </button>

          {/* Quick Action & Hamburger Button */}
          <div className="flex items-center gap-2">
            <a
              href="#download"
              onClick={() => setMobileMenuOpen(false)}
              className="inline-flex items-center gap-1 bg-[#4338ca] hover:bg-indigo-600 text-white font-mono text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Get</span>
            </a>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20 transition-colors focus:outline-none cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer Sheet */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={prefersReducedMotion ? false : { opacity: 0, y: -10, scale: 0.98 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto mt-2 rounded-2xl bg-[#0c0d12]/96 border border-white/15 backdrop-blur-xl p-5 shadow-2xl text-white space-y-4"
            >
              <nav className="flex flex-col space-y-1">
                {NAV_TABS.map((tab, idx) => (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={() => handleTabClick(idx, tab.href)}
                    className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer text-left ${
                      selected === idx
                        ? 'bg-[#4338ca] text-white font-bold'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <ChevronRight className="w-4 h-4 opacity-50" />
                  </button>
                ))}
              </nav>

              <div className="pt-2 border-t border-white/10 flex flex-col gap-2.5">
                <a
                  href="#download"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white text-[#0c0d12] font-mono text-xs font-bold uppercase tracking-wider shadow-md hover:bg-neutral-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Nova Free</span>
                </a>

                <a
                  href="https://github.com/unitybtw/nova-browser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 font-mono text-xs transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span>GitHub Repository</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
};

interface TabProps {
  children: React.ReactNode;
  setPosition: React.Dispatch<
    React.SetStateAction<{ left: number; width: number; opacity: number }>
  >;
  onClick: () => void;
}

const Tab = React.forwardRef<HTMLLIElement, TabProps>(
  ({ children, setPosition, onClick }, ref) => {
    return (
      <li
        ref={ref}
        onClick={onClick}
        onTouchStart={() => {
          if (!ref || typeof ref === 'function' || !ref.current) return;
          setPosition({
            left: ref.current.offsetLeft,
            width: ref.current.offsetWidth,
            opacity: 1,
          });
        }}
        onMouseEnter={() => {
          if (!ref || typeof ref === 'function' || !ref.current) return;
          setPosition({
            left: ref.current.offsetLeft,
            width: ref.current.offsetWidth,
            opacity: 1,
          });
        }}
        className="relative z-10 block cursor-pointer px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-tight text-white mix-blend-difference select-none whitespace-nowrap sm:px-4 sm:py-2 sm:text-xs sm:tracking-wider md:text-sm"
      >
        {children}
      </li>
    );
  }
);

Tab.displayName = 'Tab';

interface CursorProps {
  position: { left: number; width: number; opacity: number };
}

const Cursor: React.FC<CursorProps> = ({ position }) => {
  return (
    <motion.li
      animate={{
        ...position,
      }}
      transition={{
        type: 'spring',
        stiffness: 450,
        damping: 32,
      }}
      className="absolute z-0 h-6.5 top-0.5 rounded-full bg-black dark:bg-white sm:h-8.5 sm:top-1 md:h-9 pointer-events-none"
    />
  );
};

export default Navbar;
