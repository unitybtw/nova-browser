import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  HelpCircle
} from "lucide-react";
import confetti from "canvas-confetti";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [copiedBrew, setCopiedBrew] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleCopyBrew = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("brew tap unitybtw/tap && brew install --cask nova-browser");
    setCopiedBrew(true);
    try {
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.08, x: 0.75 },
        colors: ["#6366f1", "#06b6d4", "#10b981", "#ffffff"]
      });
    } catch (_) {}
    setTimeout(() => setCopiedBrew(false), 2000);
  };

  const NAV_ITEMS = [
    { label: "MANIFESTO", href: "#top", icon: Sparkles },
    { label: "FEATURES", href: "#features", icon: Layers },
    { label: "BENCHMARKS", href: "#benchmarks", icon: Cpu },
    { label: "FAQ", href: "#faq", icon: HelpCircle },
    { label: "GITHUB", href: "https://github.com/unitybtw/nova-browser", external: true, icon: Github }
  ];

  return (
    <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6 flex justify-center pointer-events-none">
      <div className="w-full max-w-5xl flex flex-col items-center pointer-events-auto">
        {/* Main Floating Spatial HUD Navigation Bar */}
        <motion.nav
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`w-full rounded-full transition-all duration-300 flex items-center justify-between px-3.5 sm:px-5 py-2 sm:py-2.5 ${
            scrolled
              ? "bg-[#0c101d]/90 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.35)] text-white"
              : "bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-sm text-neutral-900"
          }`}
        >
          {/* Left Brand Capsule & Live Silicon Status */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <a href="#top" className="flex items-center gap-2.5 group cursor-pointer">
              <div className="relative">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#4338ca] via-cyan-400 to-indigo-500 p-0.5 shadow-xs transition-transform duration-500 group-hover:scale-105">
                  <img
                    src="/nova-logo-tight.png"
                    alt="Nova Logo"
                    className="w-full h-full object-contain rounded-full bg-[#090d16] p-0.5"
                  />
                </div>
                {/* Micro green radar ping */}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090d16]" />
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-display text-lg sm:text-xl font-black tracking-tight ${
                  scrolled ? "text-white" : "text-[#171717]"
                }`}>
                  Nova
                </span>
                
                {/* Engine HUD Badge */}
                <div className={`hidden xl:inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider uppercase transition-colors ${
                  scrolled
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>WebGPU AI</span>
                </div>
              </div>
            </a>
          </div>

          {/* Center Navigation Links with Magnetic Sliding Indicator */}
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
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onMouseEnter={() => setHoveredNav(item.label)}
                  className={`relative px-3.5 py-1.5 transition-colors duration-200 z-10 ${
                    scrolled
                      ? "text-slate-300 hover:text-white"
                      : "text-neutral-600 hover:text-black"
                  }`}
                >
                  {item.label}
                  {isHovered && (
                    <motion.div
                      layoutId="nav-pill-glow"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                      className={`absolute inset-0 rounded-full -z-10 ${
                        scrolled ? "bg-white/15" : "bg-neutral-200/70"
                      }`}
                    />
                  )}
                </a>
              );
            })}
          </div>

          {/* Right Action Cluster */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* 1-Click Homebrew Quick Copy Chip */}
            <button
              onClick={handleCopyBrew}
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer shadow-2xs border ${
                scrolled
                  ? "bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-200 hover:text-white"
                  : "bg-neutral-100 hover:bg-neutral-200/90 border-neutral-200 text-neutral-800"
              }`}
              title="Copy Homebrew install command"
            >
              <Terminal className="w-3 h-3 text-cyan-500" />
              <span className="font-semibold">{copiedBrew ? "Copied!" : "brew install"}</span>
              {copiedBrew ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3 text-neutral-400" />
              )}
            </button>

            {/* GitHub Stars Button */}
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noopener noreferrer"
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-semibold transition-all duration-200 cursor-pointer border shadow-2xs active:scale-95 ${
                scrolled
                  ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white"
                  : "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700 hover:text-black"
              }`}
              title="Star Nova on GitHub"
            >
              <Github className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">GitHub</span>
              <span className="w-1 h-1 rounded-full bg-neutral-400" />
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            </a>

            {/* Primary Get Nova Download Button */}
            <a
              href="#download"
              className="font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-4 sm:px-5 py-1.5 sm:py-2 rounded-full hover:bg-[#4338ca] transition-all duration-300 flex items-center gap-1.5 font-bold shadow-md hover:shadow-lg active:scale-95"
            >
              <span>Get Nova</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className={`md:hidden p-2 rounded-full transition-colors ${
                scrolled ? "text-white hover:bg-white/10" : "text-neutral-800 hover:bg-neutral-100"
              }`}
              aria-label="Toggle mobile menu"
            >
              {isMobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </motion.nav>

        {/* Mobile Frosted Dropdown Menu */}
        <AnimatePresence>
          {isMobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="md:hidden w-full mt-2 rounded-2xl bg-[#0c101d]/95 backdrop-blur-2xl border border-white/15 p-4 text-white shadow-2xl flex flex-col gap-2 font-mono text-xs uppercase"
            >
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsMobileOpen(false)}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/10 transition-colors text-slate-200 hover:text-white"
                  >
                    <Icon className="w-4 h-4 text-indigo-400" />
                    <span>{item.label}</span>
                  </a>
                );
              })}

              <div className="pt-2 mt-2 border-t border-white/10 flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    handleCopyBrew(e);
                    setTimeout(() => setIsMobileOpen(false), 1000);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    <span>{copiedBrew ? "Command Copied!" : "brew install nova-browser"}</span>
                  </div>
                  {copiedBrew ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
