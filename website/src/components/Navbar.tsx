import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Github, Menu, X } from 'lucide-react';

const GITHUB_URL = 'https://github.com/unitybtw/nova-browser';
const RELEASES_URL = 'https://github.com/unitybtw/nova-browser/releases/latest';

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'AI Agent', href: '#agent' },
  { label: 'Performance', href: '#performance' },
  { label: 'Security', href: '#security' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = !!useReducedMotion();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const surface = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-all duration-300 ${
          surface ? 'glass shadow-lg shadow-black/20' : 'border-b border-transparent'
        }`}
      >
        <nav
          aria-label="Main navigation"
          className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
        >
          {/* Brand */}
          <a
            href="#top"
            className="flex items-center gap-2.5"
            onClick={() => setMenuOpen(false)}
          >
            <img
              src="/nova-icon-transparent.png"
              alt=""
              width={28}
              height={28}
              className="h-7 w-7"
            />
            <span className="text-[15px] font-semibold tracking-tight">Nova Browser</span>
          </a>

          {/* Desktop links */}
          <ul className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="text-sm text-muted transition-colors duration-200 hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Nova Browser on GitHub"
              className="hidden text-muted transition-colors duration-200 hover:text-foreground sm:block"
            >
              <Github size={20} aria-hidden />
            </a>
            <a
              href={RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-nova px-5 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-nova-deep"
            >
              Download
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="text-muted transition-colors duration-200 hover:text-foreground md:hidden"
            >
              {menuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: EXPO }}
            className="glass mx-4 mt-2 rounded-2xl p-2 md:hidden"
          >
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-xl px-4 py-3 text-sm text-muted transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              <li className="mt-1 border-t border-white/8 pt-2">
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-muted transition-colors duration-200 hover:bg-white/5 hover:text-foreground"
                >
                  <Github size={16} aria-hidden />
                  GitHub
                </a>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
