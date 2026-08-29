import React, { useEffect, useState } from "react";
import {
  Sparkles,
  Layers,
  Users,
  Zap,
  HelpCircle,
  Github,
  Download,
  Menu,
  X
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  external?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { id: "top", label: "MANIFESTO", href: "#top", icon: Sparkles },
  { id: "features", label: "FEATURES", href: "#features", icon: Layers },
  { id: "community", label: "COMMUNITY", href: "#community", icon: Users },
  { id: "benchmarks", label: "BENCHMARKS", href: "#benchmarks", icon: Zap },
  { id: "faq", label: "FAQ", href: "#faq", icon: HelpCircle },
  { id: "source", label: "SOURCE", href: "https://github.com/unitybtw/nova-browser", icon: Github, external: true },
];

export interface NavbarProps {
  visible?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ visible = true }) => {
  const [activeHref, setActiveHref] = useState("#top");
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // ScrollSpy to track active section smoothly
  useEffect(() => {
    const sectionIds = ["features", "community", "benchmarks", "download", "faq"];
    const handleScroll = () => {
      const scrollY = window.scrollY;

      if (scrollY < window.innerHeight * 0.4) {
        setActiveHref("#top");
        return;
      }

      const scrollPos = window.scrollY + 260;
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

  return (
    <>
      {/* DESKTOP / TABLET LEFT-SIDE FLOATING DOCK */}
      <aside
        aria-label="Sovereign Dock Navigation"
        className={`hidden md:flex fixed left-5 lg:left-7 top-1/2 -translate-y-1/2 z-50 flex-col items-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible
            ? "translate-x-0 opacity-100 pointer-events-auto"
            : "-translate-x-28 opacity-0 pointer-events-none"
        }`}
      >
        <nav
          className="relative flex flex-col items-center gap-2 p-2 rounded-full border border-white/10 bg-[#0e0f17]/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.55)] select-none"
        >
          {/* Top Logo Button */}
          <a
            href="#top"
            onClick={() => setActiveHref("#top")}
            onMouseEnter={() => setHoveredItem("logo")}
            onMouseLeave={() => setHoveredItem(null)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-[#181926] text-white transition-all duration-300 hover:bg-[#4338ca] hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
            aria-label="Nova Browser Home"
          >
            <img
              src="/nova-logo-tight.png"
              alt="Nova Logo"
              className="h-6 w-6 object-contain transition-transform duration-500 group-hover:rotate-12"
            />
            {/* Tooltip */}
            <div
              className={`absolute left-full ml-3.5 px-3 py-1.5 rounded-lg bg-[#141522] border border-white/15 text-white font-mono text-[11px] font-semibold tracking-wider uppercase shadow-xl transition-all duration-200 pointer-events-none whitespace-nowrap z-50 ${
                hoveredItem === "logo" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              }`}
            >
              Nova Sovereign
            </div>
          </a>

          {/* Micro Divider */}
          <div className="h-px w-6 bg-white/10 my-0.5" />

          {/* Navigation Items Stack */}
          <div className="flex flex-col items-center gap-1.5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeHref === item.href;
              const Icon = item.icon;

              return (
                <div key={item.id} className="relative flex items-center">
                  <a
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    onClick={() => !item.external && setActiveHref(item.href)}
                    onMouseEnter={() => setHoveredItem(item.id)}
                    onMouseLeave={() => setHoveredItem(null)}
                    aria-current={isActive ? "location" : undefined}
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      isActive
                        ? "bg-[#4338ca] text-white shadow-[0_0_15px_rgba(67,56,202,0.6)]"
                        : "text-neutral-400 hover:bg-white/10 hover:text-white hover:scale-105"
                    }`}
                    aria-label={item.label}
                  >
                    <Icon className="h-4 w-4" />
                    {isActive && (
                      <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2 w-1 rounded-r bg-white shadow-sm" />
                    )}
                  </a>

                  {/* Expanding Tooltip Label */}
                  <div
                    className={`absolute left-full ml-3.5 px-3 py-1.5 rounded-lg bg-[#141522] border border-white/15 text-white font-mono text-[11px] font-semibold tracking-wider uppercase shadow-2xl transition-all duration-200 pointer-events-none whitespace-nowrap z-50 ${
                      hoveredItem === item.id ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    }`}
                  >
                    {item.label}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Micro Divider */}
          <div className="h-px w-6 bg-white/10 my-0.5" />

          {/* Bottom Download CTA */}
          <a
            href="#download"
            onMouseEnter={() => setHoveredItem("download")}
            onMouseLeave={() => setHoveredItem(null)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-[#4338ca] to-[#3b82f6] text-white shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-[0_0_20px_rgba(67,56,202,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
            aria-label="Download Nova"
          >
            <Download className="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" />
            {/* Tooltip */}
            <div
              className={`absolute left-full ml-3.5 px-3 py-1.5 rounded-lg bg-[#4338ca] border border-indigo-300/30 text-white font-mono text-[11px] font-bold tracking-wider uppercase shadow-2xl transition-all duration-200 pointer-events-none whitespace-nowrap z-50 ${
                hoveredItem === "download" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
              }`}
            >
              Get Nova Browser
            </div>
          </a>
        </nav>
      </aside>

      {/* MOBILE BOTTOM FLOATING ISLAND DOCK */}
      <div
        className={`md:hidden fixed bottom-5 inset-x-4 z-50 flex justify-center transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          visible
            ? "translate-y-0 opacity-100 pointer-events-auto"
            : "translate-y-24 opacity-0 pointer-events-none"
        }`}
      >
        <div className="relative flex items-center justify-between gap-3 px-4 py-2.5 rounded-full border border-white/10 bg-[#0e0f17]/95 backdrop-blur-2xl shadow-2xl w-full max-w-sm select-none">
          <a href="#top" className="flex items-center gap-2" aria-label="Nova Browser">
            <img src="/nova-logo-tight.png" alt="Nova Logo" className="h-6 w-6 object-contain" />
            <span className="font-display text-sm font-bold text-white tracking-tight">Nova</span>
          </a>

          <div className="flex items-center gap-2">
            <a
              href="#download"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#4338ca] px-3.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-white shadow-md"
            >
              <Download className="h-3 w-3" />
              <span>Get</span>
            </a>

            <button
              type="button"
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
              aria-label="Toggle navigation menu"
            >
              {isMobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Expanded Drawer */}
        {isMobileOpen && (
          <div className="absolute bottom-16 inset-x-0 rounded-2xl border border-white/10 bg-[#0e0f17]/98 backdrop-blur-3xl p-3 shadow-2xl flex flex-col gap-1 z-50">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeHref === item.href;

              return (
                <a
                  key={item.id}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={() => {
                    if (!item.external) setActiveHref(item.href);
                    setIsMobileOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold transition-all ${
                    isActive ? "bg-[#4338ca] text-white" : "text-neutral-300 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Navbar;
