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
  Search,
  Layers,
  HelpCircle,
  Download,
  ArrowRight
} from "lucide-react";

export const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [copiedBrew, setCopiedBrew] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

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
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleCopyBrew = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("brew tap unitybtw/tap && brew install --cask nova-browser");
    setCopiedBrew(true);
    setTimeout(() => setCopiedBrew(false), 2200);
  };

  const NAV_ITEMS = [
    { label: "MANIFESTO", href: "#top", icon: Sparkles },
    { label: "FEATURES", href: "#features", icon: Layers, badge: "WebGPU" },
    { label: "BENCHMARKS", href: "#benchmarks", icon: Cpu },
    { label: "FAQ", href: "#faq", icon: HelpCircle },
    { label: "GITHUB", href: "https://github.com/unitybtw/nova-browser", external: true, icon: Github }
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

  return (
    <>
      <header className="fixed top-3 sm:top-5 left-0 right-0 z-50 px-3 sm:px-6 flex justify-center pointer-events-none">
        {/* Top Ambient Glow Aura */}
        <div className="absolute top-0 w-96 h-12 bg-gradient-to-r from-indigo-500/20 via-cyan-500/20 to-purple-500/20 blur-3xl -z-10 rounded-full animate-glow-pulse pointer-events-none" />

        <div className="w-full max-w-5xl flex flex-col items-center pointer-events-auto">
          {/* Main Floating Spatial HUD Navigation Bar */}
          <motion.nav
            initial={{ y: -25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className={`w-full rounded-full transition-all duration-400 flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 relative overflow-hidden ${
              scrolled
                ? "bg-[#080c18]/90 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)] text-white"
                : "bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-[0_10px_30px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)] text-neutral-900"
            }`}
          >
            {/* Top Border Laser Shimmer */}
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />

            {/* 1. LEFT: Brand Capsule with Rotating Cybernetic Orbital Aura */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
              <a href="#top" className="flex items-center gap-2.5 group cursor-pointer">
                {/* Orbital Ring Container */}
                <div className="relative p-0.5 rounded-full">
                  {/* Rotating Conic Gradient Ring */}
                  <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,#6366f1,#06b6d4,#10b981,#6366f1)] animate-spin-slow opacity-80 group-hover:opacity-100 transition-opacity" />
                  
                  {/* Logo Center Box */}
                  <div className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#080c18] p-1 flex items-center justify-center">
                    <img
                      src="/nova-logo-tight.png"
                      alt="Nova Logo"
                      className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>

                  {/* Micro Live Silicon Pulse Beacon */}
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080c18] animate-pulse" />
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-display text-lg sm:text-xl font-black tracking-tight ${
                    scrolled ? "text-white" : "text-[#171717]"
                  }`}>
                    Nova
                  </span>
                  
                  {/* Engine Telemetry HUD Badge */}
                  <div className={`hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold tracking-wider uppercase transition-all ${
                    scrolled
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  }`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Metal WebGPU</span>
                  </div>
                </div>
              </a>
            </div>

            {/* 2. CENTER: Interactive Floating Magnetic Dock */}
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
                    className={`relative px-3.5 py-1.5 transition-colors duration-200 z-10 flex items-center gap-1.5 ${
                      scrolled
                        ? "text-slate-300 hover:text-white"
                        : "text-neutral-600 hover:text-black"
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}

                    {/* Magnetic Spring Glow Pill */}
                    {isHovered && (
                      <motion.div
                        layoutId="nav-magnetic-glow"
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        className={`absolute inset-0 rounded-full -z-10 ${
                          scrolled
                            ? "bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-white/10 shadow-xs"
                            : "bg-neutral-200/80 border border-neutral-300/60 shadow-2xs"
                        }`}
                      />
                    )}
                  </a>
                );
              })}
            </div>

            {/* 3. RIGHT: Developer Action Cockpit */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              {/* Quick Search Spotlight Button (Cmd+K) */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer border ${
                  scrolled
                    ? "bg-slate-800/60 hover:bg-slate-700/80 border-slate-700/60 text-slate-300 hover:text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-700"
                }`}
                title="Open Quick Search (⌘K)"
              >
                <Search className="w-3 h-3 text-indigo-400" />
                <span className="text-[11px] font-semibold">⌘K</span>
              </button>

              {/* 1-Click Interactive Homebrew Terminal Capsule */}
              <button
                onClick={handleCopyBrew}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs transition-all cursor-pointer shadow-2xs border active:scale-95 ${
                  scrolled
                    ? "bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-200 hover:text-white"
                    : "bg-neutral-100 hover:bg-neutral-200 border-neutral-200 text-neutral-800"
                }`}
                title="Copy Homebrew install command"
              >
                <Terminal className="w-3 h-3 text-cyan-400" />
                <span className="font-semibold">{copiedBrew ? "Copied!" : "brew install"}</span>
                {!copiedBrew && <span className="text-cyan-400 font-bold animate-blink-cursor">_</span>}
                {copiedBrew ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-neutral-400" />
                )}
              </button>

              {/* GitHub Stars Button with Solar Flare Glow */}
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

              {/* Shimmering Velvet Get Nova CTA Button */}
              <a
                href="#download"
                className="relative group overflow-hidden font-mono text-xs tracking-wider uppercase bg-[#171717] text-[#fcfbf9] px-4 sm:px-5 py-1.5 sm:py-2 rounded-full transition-all duration-300 flex items-center gap-1.5 font-bold shadow-md hover:shadow-indigo-500/25 active:scale-95 border border-white/10"
              >
                {/* Internal Shimmer Wave */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative z-10">Get Nova</span>
                <ArrowUpRight className="w-3.5 h-3.5 relative z-10 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
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
                className="md:hidden w-full mt-2 rounded-2xl bg-[#080c18]/95 backdrop-blur-2xl border border-white/15 p-4 text-white shadow-2xl flex flex-col gap-2 font-mono text-xs uppercase"
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
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl rounded-2xl bg-[#0a0e1a] border border-slate-800 shadow-[0_25px_70px_rgba(0,0,0,0.6)] overflow-hidden font-sans text-white"
            >
              {/* Search Bar Input */}
              <div className="h-14 px-4 border-b border-slate-800 flex items-center gap-3 bg-[#0d1222]">
                <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search documentation, download links, benchmarks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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

              {/* Quick Results */}
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

              {/* Footer */}
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
