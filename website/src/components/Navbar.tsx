import React, { useEffect, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";
import { Menu, X, ArrowUpRight } from "lucide-react";

export type PillNavItem = {
  label: string;
  href: string;
  external?: boolean;
};

const NAV_ITEMS: PillNavItem[] = [
  { label: "MANIFESTO", href: "#top" },
  { label: "FEATURES", href: "#features" },
  { label: "BENCHMARKS", href: "#benchmarks" },
  { label: "FAQ", href: "#faq" },
  { label: "SOURCE", href: "https://github.com/unitybtw/nova-browser", external: true }
];

const BASE_COLOR = "#171717";
const PILL_COLOR = "#ffffff";
const PILL_TEXT_COLOR = "#171717";
const HOVERED_TEXT_COLOR = "#ffffff";
const EASE = "power3.out";

export const Navbar: React.FC = () => {
  const [activeHref, setActiveHref] = useState("#top");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuId = "nova-mobile-menu";
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);

  // ScrollSpy to automatically update active section on scroll
  useEffect(() => {
    const sectionIds = ["features", "community", "benchmarks", "download", "faq"];
    const handleScroll = () => {
      if (window.scrollY < 240) {
        setActiveHref("#top");
        return;
      }

      const scrollPos = window.scrollY + 200;
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
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
    if (mobileMenuRef.current) {
      gsap.killTweensOf(mobileMenuRef.current);
      gsap.set(mobileMenuRef.current, { display: "none", opacity: 0, y: -15 });
    }
  }, []);

  // Close mobile menu when clicking outside.
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

  // Keep keyboard users and small screens from getting trapped behind the menu.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const restoreMenuState = () => {
      if (mediaQuery.matches) closeMobileMenu();
    };

    mediaQuery.addEventListener("change", restoreMenuState);
    if (!isMobileMenuOpen) {
      return () => mediaQuery.removeEventListener("change", restoreMenuState);
    }

    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMobileMenu();
        mobileMenuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      mediaQuery.removeEventListener("change", restoreMenuState);
    };
  }, [closeMobileMenu, isMobileMenuOpen]);

  // Layout and GSAP timeline calculation
  const updateLayout = useCallback(() => {
    circleRefs.current.forEach((circle, index) => {
      if (!circle?.parentElement) return;

      const pill = circle.parentElement as HTMLElement;
      const rect = pill.getBoundingClientRect();
      const { width: w, height: h } = rect;

      // Guard against zero or NaN dimensions
      if (!w || !h || isNaN(w) || isNaN(h)) return;

      // Calculate the radius for the expanding circle to cover the pill
      const R = ((w * w) / 4 + h * h) / (2 * h);
      const D = Math.ceil(2 * R) + 2;
      const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;
      const originY = D - delta;

      circle.style.width = `${D}px`;
      circle.style.height = `${D}px`;
      circle.style.bottom = `-${delta}px`;

      gsap.set(circle, {
        xPercent: -50,
        scale: 0,
        transformOrigin: `50% ${originY}px`
      });

      const label = pill.querySelector<HTMLElement>(".pill-label");
      const hoverLabel = pill.querySelector<HTMLElement>(".pill-label-hover");

      if (label) gsap.set(label, { y: 0 });
      if (hoverLabel) gsap.set(hoverLabel, { y: h + 10, opacity: 0 });

      tlRefs.current[index]?.kill();
      const tl = gsap.timeline({ paused: true });

      tl.to(
        circle,
        {
          scale: 1.25,
          xPercent: -50,
          duration: 0.65,
          ease: EASE,
          overwrite: "auto"
        },
        0
      );

      if (label) {
        tl.to(
          label,
          {
            y: -(h + 8),
            duration: 0.5,
            ease: EASE,
            overwrite: "auto"
          },
          0
        );
      }

      if (hoverLabel) {
        gsap.set(hoverLabel, { y: Math.ceil(h + 12), opacity: 0 });
        tl.to(
          hoverLabel,
          {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease: EASE,
            overwrite: "auto"
          },
          0
        );
      }

      tlRefs.current[index] = tl;
    });
  }, []);

  useEffect(() => {
    updateLayout();

    const onResize = () => updateLayout();
    window.addEventListener("resize", onResize);

    if (document.fonts) {
      document.fonts.ready.then(updateLayout).catch(() => {});
    }

    // Initial mount animations
    const logo = logoRef.current;
    const navItems = navItemsRef.current;

    if (logo) {
      gsap.set(logo, { scale: 0, opacity: 0 });
      gsap.to(logo, {
        scale: 1,
        opacity: 1,
        duration: 0.75,
        ease: "back.out(1.7)"
      });
    }

    if (navItems) {
      const listItems = navItems.querySelectorAll("li");
      gsap.set(listItems, { opacity: 0, y: -10 });
      gsap.to(listItems, {
        opacity: 1,
        y: 0,
        duration: 0.55,
        stagger: 0.05,
        ease: "power2.out",
        delay: 0.15
      });
    }

    return () => window.removeEventListener("resize", onResize);
  }, [updateLayout]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.35,
      ease: EASE,
      overwrite: "auto"
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.3,
      ease: EASE,
      overwrite: "auto"
    });
  };

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.8,
      ease: "elastic.out(1, 0.5)",
      overwrite: "auto",
      onComplete: () => gsap.set(img, { rotate: 0 })
    });
  };

  const toggleMobileMenu = () => {
    if (isMobileMenuOpen) {
      closeMobileMenu();
      return;
    }

    setIsMobileMenuOpen(true);
    const menu = mobileMenuRef.current;
    if (menu) {
      gsap.killTweensOf(menu);
      gsap.set(menu, { display: "block", opacity: 0, y: -15 });
      gsap.to(menu, {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: "power3.out"
      });
    }
  };

  return (
    <header className="fixed top-4 sm:top-6 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
      <div ref={navContainerRef} className="relative z-[1000] w-full max-w-4xl mx-auto pointer-events-auto">
        <nav
          className="w-full flex items-center justify-between md:justify-center p-2 gap-3 sm:gap-4 select-none"
          aria-label="Primary Navigation"
        >
          {/* Island 1: Logo Pill */}
          <a
            ref={logoRef}
            href="#top"
            onMouseEnter={handleLogoEnter}
            className="flex-shrink-0 flex items-center justify-center rounded-full overflow-hidden transition-transform duration-300 hover:scale-105 active:scale-95 shadow-md"
            style={{
              width: "48px",
              height: "48px",
              background: BASE_COLOR
            }}
            title="Nova Browser"
          >
            <img
              ref={logoImgRef}
              src="/nova-logo-tight.png"
              alt="Nova Logo"
              className="w-7 h-7 object-contain pointer-events-none"
            />
          </a>

          {/* Island 2: Desktop Menu Pill Container */}
          <div
            ref={navItemsRef}
            className="hidden md:flex items-center rounded-full px-1.5 shadow-md border border-black/5"
            style={{
              height: "48px",
              background: BASE_COLOR
            }}
          >
            <ul
              role="menubar"
              className="list-none flex items-stretch m-0 p-0 h-full"
              style={{ gap: "6px" }}
            >
              {NAV_ITEMS.map((item, i) => {
                const isActive = activeHref === item.href;

                return (
                  <li key={item.href} role="none" className="flex items-center">
                    <a
                      role="menuitem"
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={() => !item.external && setActiveHref(item.href)}
                      aria-current={isActive ? 'page' : undefined}
                      onMouseEnter={() => handleEnter(i)}
                      onMouseLeave={() => handleLeave(i)}
                      className="relative inline-flex h-[36px] self-center items-center justify-center overflow-hidden rounded-full px-5 font-mono text-xs font-semibold uppercase tracking-wider no-underline transition-colors duration-200 hover:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] select-none"
                      style={{
                        background: PILL_COLOR,
                        color: PILL_TEXT_COLOR
                      }}
                    >
                      {/* GSAP Expanding Rising Circle */}
                      <span
                        ref={el => {
                          circleRefs.current[i] = el;
                        }}
                        className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                        style={{
                          background: BASE_COLOR,
                          willChange: "transform"
                        }}
                        aria-hidden="true"
                      />

                      {/* Dual-Text Stack Animation */}
                      <span className="label-stack relative inline-block leading-none z-[2] overflow-hidden py-1">
                        <span
                          className="pill-label relative z-[2] inline-block"
                          style={{ willChange: "transform" }}
                        >
                          {item.label}
                        </span>
                        <span
                          className="pill-label-hover absolute left-0 top-1 z-[3] inline-block w-full text-center"
                          style={{
                            color: HOVERED_TEXT_COLOR,
                            willChange: "transform, opacity"
                          }}
                          aria-hidden="true"
                        >
                          {item.label}
                        </span>
                      </span>

                      {/* Active indicator pill dot */}
                      {isActive && (
                        <span
                          className="absolute left-1/2 bottom-1 -translate-x-1/2 w-1.5 h-1.5 rounded-full z-[4] bg-[#4338ca]"
                          aria-hidden="true"
                        />
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Island 3: Get Nova CTA Pill */}
          <a
            href="#download"
            className="hidden md:flex items-center justify-center rounded-full px-6 font-mono text-xs uppercase tracking-wider font-bold text-white transition-transform duration-300 hover:scale-105 active:scale-95 shadow-md gap-1.5"
            style={{
              height: "48px",
              background: BASE_COLOR
            }}
          >
            <span>Get Nova</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>

          {/* Mobile Hamburger Button */}
          <button
            ref={mobileMenuButtonRef}
            type="button"
            onClick={toggleMobileMenu}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls={mobileMenuId}
            className="md:hidden flex items-center justify-center rounded-full transition-transform active:scale-90 shadow-md text-white"
            style={{
              width: "48px",
              height: "48px",
              background: BASE_COLOR
            }}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </nav>

        {/* Mobile Menu Dropdown */}
        <div
          id={mobileMenuId}
          ref={mobileMenuRef}
          role="region"
          aria-label="Mobile navigation"
          className="md:hidden absolute top-full left-4 right-4 mt-2 rounded-2xl overflow-hidden shadow-2xl z-[999] hidden border border-white/10"
          style={{
            background: BASE_COLOR
          }}
        >
          <ul className="list-none m-0 p-2 flex flex-col gap-1">
            {NAV_ITEMS.map(item => {
              const isActive = activeHref === item.href;
              return (
                <li key={item.href}>
                  <a
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => {
                      if (!item.external) setActiveHref(item.href);
                      closeMobileMenu();
                    }}
                    className={`block py-3 px-6 text-xs font-mono font-semibold uppercase tracking-widest rounded-xl transition-all ${
                      isActive
                        ? "bg-white text-[#171717]"
                        : "text-white/80 hover:bg-white/10 hover:text-white"
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
                onClick={closeMobileMenu}
                className="flex items-center justify-between py-3 px-6 text-xs font-mono font-bold uppercase tracking-widest bg-white text-[#171717] rounded-xl"
              >
                <span>Get Nova</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
