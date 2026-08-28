import { useEffect, useState } from 'react';
import { Download, Github, Menu, X, ArrowUpRight } from 'lucide-react';

export const Nav = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [os, setOs] = useState<'mac' | 'windows' | 'linux'>('mac');

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('win')) setOs('windows');
    else if (ua.includes('linux')) setOs('linux');
    else setOs('mac');
  }, []);

  const navLinks = [
    { label: 'Engine', href: '#engine' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Performance', href: '#performance' },
    { label: 'MCP Protocol', href: '#mcp' },
    { label: 'Downloads', href: '#downloads' },
    { label: 'FAQ', href: '#faq' },
  ];

  const osLabel = os === 'mac' ? 'Mac' : os === 'windows' ? 'Windows' : 'Linux';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0d0f17]/85 backdrop-blur-md border-b border-[#252a3f]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <a href="#top" className="flex items-center gap-2.5">
          <img src="/nova-logo-tight.png" alt="Nova" className="w-6 h-6 object-contain" />
          <span className="font-display font-extrabold text-base tracking-tight text-white">Nova Browser</span>
          <span className="font-mono text-[10px] font-semibold text-[#818cf8] bg-[#1a1e2f] border border-[#252a3f] px-1.5 py-0.5 rounded">
            v1.1.0
          </span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 font-sans text-sm text-slate-300">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-white transition-colors"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <a
            href="#downloads"
            className="action-btn-primary !min-h-[38px] !py-1.5 !px-4 !text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>Get for {osLabel}</span>
          </a>

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 rounded-lg bg-[#141724] border border-[#252a3f] text-slate-300 hover:text-white"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden p-4 bg-[#141724] border-b border-[#252a3f] space-y-3 font-sans text-sm">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 px-3 rounded-lg text-slate-300 hover:bg-[#1a1e2f] hover:text-white"
            >
              {link.label}
            </a>
          ))}
          <a
            href="https://github.com/unitybtw/nova-browser"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center justify-between py-2 px-3 rounded-lg text-slate-300 hover:bg-[#1a1e2f] hover:text-white"
          >
            <span className="flex items-center gap-2">
              <Github className="w-4 h-4" />
              <span>GitHub Repository</span>
            </span>
            <ArrowUpRight className="w-4 h-4 text-slate-500" />
          </a>
        </div>
      )}
    </header>
  );
};

export default Nav;
