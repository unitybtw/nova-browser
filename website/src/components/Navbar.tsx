import React, { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { 
  ArrowUpRight, 
  Github, 
  Star, 
  Terminal, 
  Check, 
  Copy, 
  Menu, 
  X, 
  Cpu, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Download, 
  Search, 
  ArrowRight 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type PillNavItem = {
  label: string;
  href: string;
  external?: boolean;
  icon?: React.ElementType;
};

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeHref, setActiveHref] = useState("#top");
  const [copiedBrew, setCopiedBrew] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const circleRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const tlRefs = useRef<Array<gsap.core.Timeline | null>>([]);
  const activeTweenRefs = useRef<Array<gsap.core.Tween | null>>([]);
  const logoImgRef = useRef<HTMLImageElement | null>(null);
  const logoTweenRef = useRef<gsap.core.Tween | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const navItemsRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLAnchorElement | null>(null);

  const items: PillNavItem[] = [
    { label: "MANIFESTO", href: "#top", icon: Sparkles },
    { label: "FEATURES", href: "#features", icon: Layers },
    { label: "BENCHMARKS", href: "#benchmarks", icon: Cpu },
    { label: "FAQ", href: "#faq", icon: HelpCircle },
    { label: "SOURCE", href: "https://github.com/unitybtw/nova-browser", external: true, icon: Github }
  ];

  const QUICK_COMMANDS = [
    { title: "Download for macOS (Apple Silicon)", subtitle: "Homebrew Cask & DMG v1.1.0", href: "#download", icon: Download },
    { title: "Download for Windows 10/11", subtitle: "Direct Setup NSIS Installer", href: "#download", icon: Download },
    { title: "View WebGPU Inference Benchmarks", subtitle: "Speedometer 3.0 & RAM comparison", href: "#benchmarks", icon: Cpu },
    { title: "Explore Architecture Matrix", subtitle: "Rust ad-blocker & Local MCP server", href: "#features", icon: Layers },
    { title: "Star Nova on GitHub", subtitle: "Open source repository (MIT)", href: "https://github.com/unitybtw/nova-browser", external: true, icon: Star }
  ];

  const filteredCommands = QUICK_COMMANDS.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // GSAP PillNav Hover Math & Layout Initialization
  useEffect(() => {
    const ease = "power3.out";
    
    const layout = () => {
      circleRefs.current.forEach((circle, index) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement as HTMLElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;

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
        const white = pill.querySelector<HTMLElement>(".pill-label-hover");

        if (label) gsap.set(label, { y: 0 });
        if (white) gsap.set(white, { y: h + 10, opacity: 0 });

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, {
          scale: 1.25,
          xPercent: -50,
          duration: 0.65,
          ease,
          overwrite: "auto"
        }, 0);

        if (label) {
          tl.to(label, {
            y: -(h + 6),
            duration: 0.5,
            ease,
            overwrite: "auto"
          }, 0);
        }

        if (white) {
          gsap.set(white, { y: Math.ceil(h + 12), opacity: 0 });
          tl.to(white, {
            y: 0,
            opacity: 1,
            duration: 0.5,
            ease,
            overwrite: "auto"
          }, 0);
        }

        tlRefs.current[index] = tl;
      });
    };

    layout();

    const onResize = () => layout();
    window.addEventListener("resize", onResize);

    if (document.fonts) {
      document.fonts.ready.then(layout).catch(() => {});
    }

    // Initial load animation
    const logo = logoRef.current;
    const navItems = navItemsRef.current;

    if (logo) {
      gsap.set(logo, { scale: 0, opacity: 0 });
      gsap.to(logo, {
        scale: 1,
        opacity: 1,
        duration: 0.8,
        ease: "back.out(1.7)"
      });
    }

    if (navItems) {
      const listItems = navItems.querySelectorAll("li");
      gsap.set(listItems, { opacity: 0, y: -10 });
      gsap.to(listItems, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.06,
        ease: "power2.out",
        delay: 0.15
      });
    }

    return () => window.removeEventListener("resize", onResize);
  }, [items]);

  const handleEnter = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(tl.duration(), {
      duration: 0.35,
      ease: "power3.out",
      overwrite: "auto"
    });
  };

  const handleLeave = (i: number) => {
    const tl = tlRefs.current[i];
    if (!tl) return;
    activeTweenRefs.current[i]?.kill();
    activeTweenRefs.current[i] = tl.tweenTo(0, {
      duration: 0.3,
      ease: "power3.out",
      overwrite: "auto"
    });
  };

  // Rotating logo interaction
  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.85,
      ease: "elastic.out(1, 0.5)",
      overwrite: "auto",
      onComplete: () => gsap.set(img, { rotate: 0 })
    });
  };

  // GSAP Mobile Menu Toggle
  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);

    const menu = mobileMenuRef.current;
    if (menu) {
      if (newState) {
        gsap.set(menu, { display: "block", opacity: 0, y: -15 });
        gsap.to(menu, {
          opacity: 1,
          y: 0,
          duration: 0.35,
          ease: "power3.out"
        });
      } else {
        gsap.to(menu, {
          opacity: 0,
          y: -15,
          duration: 0.25,
          ease: "power3.in",
          onComplete: () => {
            gsap.set(menu, { display: "none" });
          }
        });
      }
    }
  };

  const handleCopyBrew = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("brew tap unitybtw/tap && brew install --cask nova-browser");
    setCopiedBrew(true);
    setTimeout(() => setCopiedBrew(false), 2200);
  };

  return (
    <>
      <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6 flex justify-center pointer-events-none">
        <div className="w-full max-w-5xl flex flex-col items-center pointer-events-auto">
          {/* Main Floating PillNav Shell */}
          <nav
            className={`w-full rounded-full transition-all duration-300 flex items-center justify-between p-1.5 sm:p-2 ${
              scrolled
                ? "bg-[#090d18]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45)] text-white"
                : "bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.06)] text-neutral-900"
            }`}
          >
            {/* 1. Left Logo Pill with GSAP 360 Spin on Hover */}
            <a
              ref={logoRef}
              href="#top"
              onMouseEnter={handleLogoEnter}
              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full transition-all duration-200 ${
                scrolled ? "hover:bg-white/10" : "hover:bg-neutral-100"
              }`}
            >
              <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-[#4338ca] via-cyan-400 to-indigo-500 p-0.5 shadow-xs flex items-center justify-center">
                <img
                  ref={logoImgRef}
                  src="/nova-logo-tight.png"
                  alt="Nova Logo"
                  className="w-full h-full object-contain rounded-full bg-[#080c18] p-0.5 pointer-events-none"
                />
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border-2 border-[#080c18] animate-pulse" />
              </div>
              <span className="font-display font-black text-lg tracking-tight">Nova</span>
            </a>

            {/* 2. Desktop PillNav Items with GSAP Rising Circle Animation */}
            <div
              ref={navItemsRef}
              className={`hidden md:flex items-center rounded-full p-1 border transition-colors ${
                scrolled
                  ? "bg-[#111728] border-slate-700/60"
                  : "bg-[#f4f3f0] border-neutral-200/80"
              }`}
            >
              <ul role="menubar" className="list-none flex items-center m-0 p-0 gap-1">
                {items.map((item, i) => {
                  const isActive = activeHref === item.href;
                  return (
                    <li key={item.href} role="none" className="flex items-center">
                      <a
                        role="menuitem"
                        href={item.href}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={() => !item.external && setActiveHref(item.href)}
                        onMouseEnter={() => handleEnter(i)}
                        onMouseLeave={() => handleLeave(i)}
                        className={`relative overflow-hidden inline-flex items-center justify-center h-8 px-4 rounded-full no-underline font-mono text-xs uppercase tracking-wider font-semibold cursor-pointer transition-all duration-200 select-none ${
                          scrolled
                            ? isActive
                              ? "bg-indigo-600 text-white shadow-xs"
                              : "bg-[#182035] text-slate-300"
                            : isActive
                            ? "bg-[#171717] text-white shadow-xs"
                            : "bg-white text-neutral-700"
                        }`}
                      >
                        {/* GSAP Rising Circle */}
                        <span
                          ref={el => {
                            circleRefs.current[i] = el;
                          }}
                          className="hover-circle absolute left-1/2 bottom-0 rounded-full z-[1] block pointer-events-none"
                          style={{
                            background: scrolled ? "#4338ca" : "#171717",
                            willChange: "transform"
                          }}
                          aria-hidden="true"
                        />

                        {/* Dual Text Vertical Roll */}
                        <span className="label-stack relative inline-block leading-none z-[2] overflow-hidden py-1">
                          <span
                            className="pill-label relative z-[2] inline-block"
                            style={{ willChange: "transform" }}
                          >
                            {item.label}
                          </span>
                          <span
                            className="pill-label-hover absolute left-0 top-1 z-[3] inline-block w-full text-center text-white"
                            style={{ willChange: "transform, opacity" }}
                            aria-hidden="true"
                          >
                            {item.label}
                          </span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* 3. Right Action Cluster */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Search Spotlight Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer border ${
                  scrolled
                    ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700"
                }`}
                title="Search documentation (⌘K)"
              >
                <Search className="w-3 h-3 text-indigo-400" />
                <span className="text-[11px] font-semibold">⌘K</span>
              </button>

              {/* 1-Click Homebrew Pill */}
              <button
                onClick={handleCopyBrew}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer border shadow-2xs active:scale-95 ${
                  scrolled
                    ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800"
                }`}
                title="Copy Homebrew install command"
              >
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span className="font-semibold">{copiedBrew ? "Copied!" : "brew install"}</span>
                {copiedBrew ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-neutral-400" />
                )}
              </button>

              {/* Primary Get Nova CTA Pill */}
              <a
                href="#download"
                className="font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-4 sm:px-5 py-2 rounded-full hover:bg-[#4338ca] transition-all duration-300 flex items-center gap-1.5 font-bold shadow-md hover:shadow-indigo-500/25 active:scale-95 border border-white/10"
              >
                <span>Get Nova</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>

              {/* Mobile Hamburger Button */}
              <button
                onClick={toggleMobileMenu}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
                className={`md:hidden flex items-center justify-center w-8 h-8 rounded-full transition-transform active:scale-90 ${
                  scrolled ? "bg-slate-800 text-white" : "bg-neutral-100 text-neutral-900"
                }`}
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>

          {/* GSAP Mobile Menu Dropdown */}
          <div
            ref={mobileMenuRef}
            className="md:hidden w-full mt-2 rounded-2xl overflow-hidden shadow-2xl z-[999] hidden border border-white/10 bg-[#090d18]/95 backdrop-blur-2xl text-white p-3 font-mono text-xs uppercase"
          >
            <ul className="list-none m-0 p-0 flex flex-col gap-1">
              {items.map(item => {
                const Icon = item.icon || Sparkles;
                return (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      onClick={() => toggleMobileMenu()}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-slate-200 hover:text-white"
                    >
                      <Icon className="w-4 h-4 text-indigo-400" />
                      <span>{item.label}</span>
                    </a>
                  </li>
                );
              })}
              <li className="pt-2 mt-1 border-t border-white/10">
                <button
                  onClick={e => {
                    handleCopyBrew(e);
                    setTimeout(() => toggleMobileMenu(), 1000);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>{copiedBrew ? "Copied!" : "brew install nova-browser"}</span>
                  </div>
                  {copiedBrew ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Interactive Raycast-style Spotlight Command Modal (Cmd+K) */}
      <AnimatePresence>
        {isSearchOpen && (
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            onClick={() => setIsSearchOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -15 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl bg-[#0a0e1a] border border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden font-sans text-white"
            >
              <div className="h-14 px-4 border-b border-slate-800 flex items-center gap-3 bg-[#0d1222]">
                <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search documentation, download links, benchmarks..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-1 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-2 max-h-[320px] overflow-y-auto space-y-1">
                {filteredCommands.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-mono text-xs">
                    No results for "{searchQuery}".
                  </div>
                ) : (
                  filteredCommands.map((cmd, idx) => {
                    const Icon = cmd.icon;
                    return (
                      <a
                        key={idx}
                        href={cmd.href}
                        target={cmd.external ? "_blank" : undefined}
                        rel={cmd.external ? "noopener noreferrer" : undefined}
                        onClick={() => setIsSearchOpen(false)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-indigo-600/20 border border-transparent hover:border-indigo-500/30 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-slate-800 text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-slate-200 group-hover:text-white">{cmd.title}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{cmd.subtitle}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors" />
                      </a>
                    );
                  })
                )}
              </div>

              <div className="h-9 px-4 bg-[#0d1222]/80 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                <span>Navigation Shortcut</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700">ESC to exit</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
