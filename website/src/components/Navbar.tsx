import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Lock,
  Plus,
  X,
  ArrowUpRight,
  Download,
  Github,
  Terminal,
  Layers,
  Globe,
  Cpu,
  HelpCircle,
  Sparkles,
  LayoutGrid,
  ChevronRight
} from "lucide-react";

export type ChromeTabItem = {
  id: string;
  label: string;
  url: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tagline: string;
  external?: boolean;
};

const TABS: ChromeTabItem[] = [
  {
    id: "top",
    label: "Manifesto",
    url: "nova://manifesto",
    href: "#top",
    icon: Terminal,
    tagline: "Kinetic typography declaration of sovereign computing."
  },
  {
    id: "features",
    label: "Features",
    url: "nova://features",
    href: "#features",
    icon: Layers,
    tagline: "5 sovereign architectural modules & on-device AI."
  },
  {
    id: "community",
    label: "Community",
    url: "nova://community",
    href: "#community",
    icon: Globe,
    tagline: "Global open-source telemetry & GitHub activity."
  },
  {
    id: "benchmarks",
    label: "Benchmarks",
    url: "nova://benchmarks",
    href: "#benchmarks",
    icon: Cpu,
    tagline: "0.2ms cold start & local GPU neural runtime speeds."
  },
  {
    id: "faq",
    label: "FAQ",
    url: "nova://faq",
    href: "#faq",
    icon: HelpCircle,
    tagline: "Technical architecture, privacy guarantees, and usage."
  }
];

export interface NavbarProps {
  visible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ visible = true }) => {
  const [activeTabId, setActiveTabId] = useState<string>("top");
  const [isTabSwitcherOpen, setIsTabSwitcherOpen] = useState(false);
  const [isOmniboxFocused, setIsOmniboxFocused] = useState(false);
  const navContainerRef = useRef<HTMLDivElement | null>(null);

  // ScrollSpy to automatically update active section on scroll
  useEffect(() => {
    const sectionIds = ["faq", "benchmarks", "community", "features", "top"];
    const handleScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY < 240) {
        setActiveTabId("top");
        return;
      }

      const scrollPos = scrollY + 280;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveTabId(id);
            return;
          }
        }
      }
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeTabSwitcher = useCallback(() => {
    setIsTabSwitcherOpen(false);
  }, []);

  // Close tab switcher on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isTabSwitcherOpen &&
        navContainerRef.current &&
        !navContainerRef.current.contains(e.target as Node)
      ) {
        closeTabSwitcher();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeTabSwitcher, isTabSwitcherOpen]);

  const activeTab = TABS.find((t) => t.id === activeTabId) || TABS[0];

  const handleTabClick = (href: string, id: string) => {
    setActiveTabId(id);
    closeTabSwitcher();
    if (href.startsWith("#")) {
      const targetId = href.slice(1);
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  };

  return (
    <motion.header
      initial={false}
      animate={{
        y: visible ? 0 : -100,
        opacity: visible ? 1 : 0,
      }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-3 inset-x-0 z-50 flex justify-center px-2.5 sm:px-6 pointer-events-none"
    >
      <div
        ref={navContainerRef}
        className="pointer-events-auto w-full max-w-4xl rounded-xl border border-neutral-800/90 bg-[#121217]/95 shadow-[0_16px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all"
        style={{ transform: "translateZ(0)" }}
      >
        {/* Top Browser Tabstrip */}
        <div className="flex items-center justify-between border-b border-neutral-800/80 px-2.5 py-1.5 sm:px-3">
          {/* macOS Window Controls (Traffic Lights) + Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 pl-1 pr-1">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]/90 transition-transform hover:scale-125" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]/90 transition-transform hover:scale-125" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]/90 transition-transform hover:scale-125" />
            </div>

            <a
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("#top", "top");
              }}
              className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-bold tracking-wider text-neutral-300 transition-colors hover:text-white"
            >
              <img
                src="/icons/icon-192x192.png"
                alt="Nova Logo"
                className="h-3.5 w-3.5 rounded object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="hidden sm:inline">NOVA</span>
            </a>
          </div>

          {/* Desktop Chrome Tabs (Hidden on small mobile screens) */}
          <div className="hidden md:flex items-center gap-1 overflow-x-auto no-scrollbar max-w-[560px]">
            {TABS.map((tab) => {
              const isActive = activeTabId === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.href, tab.id)}
                  type="button"
                  className={`group relative flex items-center gap-2 rounded-t-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#1e1e26] text-white shadow-xs border-t-2 border-[#6366f1]"
                      : "text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200"
                  }`}
                >
                  <Icon
                    className={`h-3.5 w-3.5 transition-colors ${
                      isActive ? "text-[#818cf8]" : "text-neutral-500 group-hover:text-neutral-300"
                    }`}
                  />
                  <span>{tab.label}</span>
                  {isActive ? (
                    <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#6366f1]" />
                  ) : (
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity text-neutral-500 hover:text-white text-[10px] leading-none ml-1">
                      <X className="h-2.5 w-2.5" />
                    </span>
                  )}
                </button>
              );
            })}

            {/* Browser New Tab Button (+) */}
            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("#download", "download");
              }}
              title="New Tab / Download Nova"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-800/80 hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Mobile Active Tab Pill / Switcher Trigger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsTabSwitcherOpen(!isTabSwitcherOpen)}
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800/80 px-2.5 py-1 text-xs font-medium text-white shadow-xs"
            >
              <activeTab.icon className="h-3 w-3 text-[#818cf8]" />
              <span className="max-w-[90px] truncate">{activeTab.label}</span>
              <span className="rounded bg-neutral-700 px-1 py-0.2 text-[9px] font-mono text-neutral-300">
                {TABS.length}
              </span>
            </button>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5">
            <a
              href="https://github.com/unitybtw/nova-browser"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex h-7 items-center gap-1 rounded-md border border-neutral-700/80 bg-neutral-800/50 px-2 text-[11px] font-mono text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
              title="View on GitHub"
            >
              <Github className="h-3 w-3" />
              <span>GitHub</span>
              <ArrowUpRight className="h-2.5 w-2.5 text-neutral-500" />
            </a>

            <a
              href="#download"
              onClick={(e) => {
                e.preventDefault();
                handleTabClick("#download", "download");
              }}
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-[#6366f1] px-2.5 text-[11px] font-mono font-semibold text-white shadow-xs hover:bg-[#4f46e5] active:scale-95 transition-all"
            >
              <Download className="h-3 w-3" />
              <span>Get Nova</span>
            </a>

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setIsTabSwitcherOpen(!isTabSwitcherOpen)}
              type="button"
              className="md:hidden flex h-7 w-7 items-center justify-center rounded-md border border-neutral-700 bg-neutral-800 text-neutral-300 hover:text-white"
              aria-label="Toggle tab switcher"
            >
              {isTabSwitcherOpen ? <X className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {/* Bottom Omnibox Address Status Bar */}
        <div className="flex items-center justify-between px-3 py-1 bg-[#0d0d12]/80 rounded-b-xl border-t border-neutral-800/50">
          <div className="flex items-center gap-2 w-full max-w-xl">
            {/* Security Lock Badge */}
            <div className="flex items-center gap-1 rounded px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 text-emerald-400 text-[10px] font-mono">
              <Shield className="h-2.5 w-2.5" />
              <Lock className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Secure</span>
            </div>

            {/* Interactive / Dynamic Omnibox URL pill */}
            <div
              onMouseEnter={() => setIsOmniboxFocused(true)}
              onMouseLeave={() => setIsOmniboxFocused(false)}
              className="flex items-center gap-1.5 flex-1 rounded bg-neutral-900/90 border border-neutral-800/80 px-2.5 py-0.5 font-mono text-[11px] text-neutral-300 shadow-inner"
            >
              <span className="text-[#818cf8] font-semibold select-none">nova://</span>
              <span className="text-white font-medium">{activeTab.url.replace("nova://", "")}</span>
              {isOmniboxFocused && (
                <span className="ml-auto hidden sm:inline text-[9px] text-neutral-500">
                  press Enter to navigate
                </span>
              )}
            </div>
          </div>

          {/* Right Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 pl-3 text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Local AI Hardened</span>
            </span>
          </div>
        </div>

        {/* Mobile Tab Switcher Drawer */}
        <AnimatePresence>
          {isTabSwitcherOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden border-t border-neutral-800 bg-[#121217] p-3 overflow-hidden rounded-b-xl"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                  Open Tabs ({TABS.length})
                </span>
                <span className="font-mono text-[10px] text-emerald-400 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5" />
                  Sovereign Session
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {TABS.map((tab) => {
                  const isActive = activeTabId === tab.id;
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabClick(tab.href, tab.id)}
                      type="button"
                      className={`flex items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                        isActive
                          ? "border-[#6366f1] bg-[#1e1e28] text-white shadow-xs"
                          : "border-neutral-800 bg-neutral-900/60 text-neutral-300 hover:bg-neutral-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${
                            isActive ? "bg-[#6366f1]/20 text-[#818cf8]" : "bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold">{tab.label}</span>
                            <span className="font-mono text-[10px] text-neutral-500">{tab.url}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-1">{tab.tagline}</p>
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-neutral-500" />
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
                <a
                  href="https://github.com/unitybtw/nova-browser"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white font-mono"
                >
                  <Github className="h-3.5 w-3.5" />
                  <span>GitHub Repository</span>
                </a>
                <a
                  href="#download"
                  onClick={(e) => {
                    e.preventDefault();
                    handleTabClick("#download", "download");
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#818cf8] font-semibold font-mono"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Desktop App</span>
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
};

export default Navbar;
