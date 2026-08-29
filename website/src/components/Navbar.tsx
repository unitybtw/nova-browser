import React, { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

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
      const { width } = selectedTab.getBoundingClientRect();
      setPosition({
        left: selectedTab.offsetLeft,
        width,
        opacity: 1,
      });
    }
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
    <header
      className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-12 opacity-0'
      }`}
    >
      <div className="pointer-events-auto">
        <ul
          onMouseLeave={() => {
            const selectedTab = tabsRef.current[selected];
            if (selectedTab) {
              const { width } = selectedTab.getBoundingClientRect();
              setPosition({
                left: selectedTab.offsetLeft,
                width,
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
        onMouseEnter={() => {
          if (!ref || typeof ref === 'function' || !ref.current) return;
          const { width } = ref.current.getBoundingClientRect();
          setPosition({
            left: ref.current.offsetLeft,
            width,
            opacity: 1,
          });
        }}
        className="relative z-10 block cursor-pointer px-3 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-white mix-blend-difference select-none sm:px-4 sm:py-2 md:text-sm"
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
      className="absolute z-0 h-7 rounded-full bg-black dark:bg-white sm:h-9 md:h-9 pointer-events-none"
    />
  );
};

export default Navbar;
