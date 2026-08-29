import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Menu, X, ArrowUpRight } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "MANIFESTO", href: "#top" },
  { label: "FEATURES", href: "#features" },
  { label: "COMMUNITY", href: "#community" },
  { label: "BENCHMARKS", href: "#benchmarks" },
  { label: "FAQ", href: "#faq" },
  { label: "SOURCE", href: "https://github.com/unitybtw/nova-browser", external: true },
];

export interface NavbarProps {
  visible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ visible = true }) => {
  const [activeHref, setActiveHref] = useState("#top");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Slide-Tabs kinetic cursor position state
  const [cursorPos, setCursorPos] = useState({
    left: 0,
    width: 0,
    opacity: 0,
  });

  const tabRefs = useRef<(HTMLLIElement | null)[]>([]);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuId = "nova-mobile-menu";

  // Sync cursor with currently active scroll section
  const syncCursorToActive = useCallback(() => {
    const activeIdx = NAV_ITEMS.findIndex((item) => item.href === activeHref);
    const targetEl = tabRefs.current[activeIdx >= 0 ? activeIdx : 0];
    if (targetEl) {
      setCursorPos({
        left: targetEl.offsetLeft,
        width: targetEl.offsetWidth,
        opacity: 1,
      });
    }
  }, [activeHref]);

  useEffect(() => {
    syncCursorToActive();
  }, [syncCursorToActive]);

  // ScrollSpy to automatically update active section on scroll (120 FPS rAF throttled)
  useEffect(() => {
    const sectionIds = ["features", "community", "benchmarks", "download", "faq"];
    let ticking = false;

    const updateActiveSection = () => {
      const scrollY = window.scrollY;

      if (scrollY < 240) {
        setActiveHref("#top");
        ticking = false;
        return;
      }

      const scrollPos = scrollY + 200;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveHref(`#${id}`);
            break;
          }
        }
      }
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(updateActiveSection);
      }
    };

    updateActiveSection();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close mobile menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isMobileMenuOpen &&
        navContainerRef.current &&
        !navContainerRef.current.contains(e.target as Node)
      ) {
        closeMobileMenu();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeMobileMenu, isMobileMenuOpen]);

  // Close mobile menu on Escape key or resize to desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileMenuOpen) {
        closeMobileMenu();
        mobileMenuButtonRef.current?.focus();
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) {
        closeMobileMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [closeMobileMenu, isMobileMenuOpen]);

  const handleNavClick = (e: React.MouseEvent, href: string, external?: boolean) => {
    if (external) return;
    e.preventDefault();
    setActiveHref(href);
    closeMobileMenu();

    const targetId = href.slice(1);
    if (targetId === "top" || targetId === "manifesto") {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? "auto" : "smooth" });
    } else {
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      }
    }
  };

  return (
    <header
      className={`fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-12 opacity-0"
      }`}
    >
      <div ref={navContainerRef} className="relative z-[1000] pointer-events-auto">
        <nav
          className="flex items-center justify-center gap-2 sm:gap-3 select-none"
          aria-label="Primary Navigation"
        >
          {/* 1. Sovereign Logo Pill */}
          <a
            href="#top"
            onClick={(e) => handleNavClick(e, "#top")}
            className="flex h-11 w-11 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-[#171717] border border-white/10 shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2"
            title="Nova Browser — Sovereign On-Device AI"
          >
            <img
              src="/nova-logo-tight.png"
              alt="Nova Logo"
              className="h-6 w-6 sm:h-7 sm:w-7 object-contain pointer-events-none"
            />
          </a>

          {/* 2. Desktop Kinetic SlideTabs Pill Island (Centered) */}
          <div className="hidden md:flex items-center rounded-full bg-[#171717] border border-white/10 p-1 shadow-xl">
            <ul
              onMouseLeave={syncCursorToActive}
              className="relative flex items-center gap-1 m-0 p-0 list-none"
              role="menubar"
            >
              {NAV_ITEMS.map((item, i) => {
                const isActive = activeHref === item.href;
                return (
                  <li
                    key={item.href}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    role="none"
                    onMouseEnter={(e) => {
                      const target = e.currentTarget;
                      setCursorPos({
                        left: target.offsetLeft,
                        width: target.offsetWidth,
                        opacity: 1,
                      });
                    }}
                    className="relative z-10"
                  >
                    <a
                      role="menuitem"
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={(e) => handleNavClick(e, item.href, item.external)}
                      aria-current={isActive ? "location" : undefined}
                      className={`relative block px-4 py-2 font-mono text-xs font-semibold uppercase tracking-wider transition-colors duration-150 rounded-full select-none ${
                        isActive ? "text-[#171717]" : "text-neutral-300 hover:text-white"
                      }`}
                    >
                      {item.label}
                    </a>
                  </li>
                );
              })}

              {/* Kinetic Slide Cursor */}
              <motion.li
                animate={
                  prefersReducedMotion
                    ? false
                    : {
                        left: cursorPos.left,
                        width: cursorPos.width,
                        opacity: cursorPos.opacity,
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 450,
                  damping: 32,
                }}
                className="absolute top-1 bottom-1 z-0 rounded-full bg-white shadow-md pointer-events-none"
                aria-hidden="true"
              />
            </ul>
          </div>

          {/* 3. Action Pill: Get Nova CTA */}
          <a
            href="#download"
            onClick={(e) => handleNavClick(e, "#download")}
            className="hidden items-center justify-center gap-1.5 rounded-full bg-[#4338ca] px-5 py-2.5 sm:px-6 sm:py-3 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all duration-200 hover:bg-[#3730a3] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 md:flex"
          >
            <span>Get Nova</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>

          {/* 4. Mobile Hamburger Button */}
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileMenuId}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#171717] border border-white/10 text-white shadow-lg transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca] focus-visible:ring-offset-2 md:hidden cursor-pointer"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </nav>

        {/* 5. Mobile Menu Dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              id={mobileMenuId}
              ref={mobileMenuRef}
              role="navigation"
              aria-label="Mobile navigation"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 rounded-2xl bg-[#171717] border border-white/10 p-2 shadow-2xl z-[999] overflow-hidden"
            >
              <ul className="list-none m-0 p-0 flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = activeHref === item.href;
                  return (
                    <li key={item.href}>
                      <a
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={(e) => handleNavClick(e, item.href, item.external)}
                        aria-current={isActive ? "location" : undefined}
                        className={`block py-2.5 px-4 text-xs font-mono font-semibold uppercase tracking-wider rounded-xl transition-all ${
                          isActive
                            ? "bg-white text-[#171717] font-bold"
                            : "text-neutral-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        {item.label}
                      </a>
                    </li>
                  );
                })}
                <li className="pt-1 mt-1 border-t border-white/10">
                  <a
                    href="#download"
                    onClick={(e) => handleNavClick(e, "#download")}
                    className="flex items-center justify-between py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-wider bg-[#4338ca] text-white rounded-xl hover:bg-[#3730a3]"
                  >
                    <span>Get Nova</span>
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </li>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
