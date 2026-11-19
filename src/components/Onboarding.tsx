import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Sun,
  Moon,
  Monitor,
  Search,
  Shield,
  Ban,
  EyeOff,
  Bug,
  ArrowRight,
  Check,
  Upload,
} from 'lucide-react';
import { EASE_OUT } from '../utils/motion';
import { getElectronAPI } from '../utils/electronBridge';

interface OnboardingProps {
  onComplete: (prefs: {
    theme: 'light' | 'dark' | 'system';
    searchEngine: 'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia';
    privacyShield: boolean;
    importedBookmarks?: any[];
  }) => void;
}

const SEARCH_ENGINES = [
  {
    id: 'google' as const,
    name: 'Google',
    desc: 'Search with Google',
    icon: (
      <svg viewBox="0 0 48 48" className="w-5 h-5">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </svg>
    ),
  },
  {
    id: 'duckduckgo' as const,
    name: 'DuckDuckGo',
    desc: 'Privacy-focused search',
    icon: (
      <div className="w-5 h-5 rounded-full bg-[#DE5833] flex items-center justify-center">
        <Shield className="w-3 h-3 text-white" />
      </div>
    ),
  },
  {
    id: 'brave' as const,
    name: 'Brave Search',
    desc: 'Independent search index',
    icon: (
      <div className="w-5 h-5 rounded-full bg-[#FB542B] flex items-center justify-center">
        <Search className="w-3 h-3 text-white" />
      </div>
    ),
  },
  {
    id: 'bing' as const,
    name: 'Bing',
    desc: 'Search with Microsoft Bing',
    icon: (
      <svg viewBox="0 0 48 48" className="w-5 h-5">
        <path fill="#0078D4" d="M10 5l8 3v26l-8-5z" />
        <path fill="#00B4F0" d="M18 8l14 8-14 9z" />
        <path fill="#FFB900" d="M18 25l14-9 6 18z" />
        <path fill="#0078D4" d="M18 25v9l20 9-6-18z" />
      </svg>
    ),
  },
  {
    id: 'ecosia' as const,
    name: 'Ecosia',
    desc: 'Search with Ecosia',
    icon: (
      <div className="w-5 h-5 rounded-full bg-[#00894A] flex items-center justify-center">
        <Search className="w-3 h-3 text-white" />
      </div>
    ),
  },
];

const THEME_OPTIONS = [
  { id: 'light' as const, name: 'Light', subtitle: 'Crisp studio canvas', icon: Sun },
  { id: 'dark' as const, name: 'Dark', subtitle: 'Low-glare precision', icon: Moon },
  { id: 'system' as const, name: 'System', subtitle: 'Follows macOS / OS', icon: Monitor },
];

const TOTAL_STEPS = 6;
const NO_DRAG_STYLE = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;
const DRAG_STYLE = { WebkitAppRegion: 'drag' } as React.CSSProperties;

/** Live reactive mini browser frame reflecting chosen theme inside Step 2. */
function LiveBrowserThemePreview({
  theme,
  resolvedIsLight,
}: {
  theme: 'light' | 'dark' | 'system';
  resolvedIsLight: boolean;
}) {
  const isSplitSystem = theme === 'system';

  const renderChromeSurface = (light: boolean) => (
    <div
      className={`w-full h-full flex flex-col transition-colors duration-300 ${
        light ? 'bg-[#fbfbfc] text-neutral-900' : 'bg-[#0e0f12] text-neutral-100'
      }`}
    >
      {/* Tab strip & traffic dots */}
      <div
        className={`h-6 px-2.5 flex items-center gap-2 border-b transition-colors duration-300 ${
          light ? 'bg-[#f4f4f6] border-neutral-200/80' : 'bg-[#111216] border-white/[0.06]'
        }`}
      >
        <div className="flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400/50" />
          <span className="w-1.5 h-1.5 rounded-full bg-neutral-400/50" />
        </div>
        <div
          className={`h-4 px-2 rounded flex items-center gap-1.5 text-[9px] font-medium transition-colors duration-300 ${
            light
              ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/70'
              : 'bg-[#1a1b20] text-white border border-white/[0.07]'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
          <span>New Tab</span>
        </div>
      </div>

      {/* Omnibox strip */}
      <div
        className={`h-7 px-3 flex items-center border-b transition-colors duration-300 ${
          light ? 'bg-white border-neutral-200/70' : 'bg-[#141518] border-white/[0.06]'
        }`}
      >
        <div
          className={`w-full h-4 rounded-md px-2 flex items-center text-[9px] transition-colors duration-300 ${
            light
              ? 'bg-neutral-100 text-neutral-400 border border-neutral-200/60'
              : 'bg-white/[0.05] text-neutral-500 border border-white/[0.07]'
          }`}
        >
          nova://newtab
        </div>
      </div>

      {/* Mini New Tab Canvas */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2.5 px-6">
        <div className="text-lg font-semibold tracking-tight tabular-nums leading-none">
          09:41
        </div>
        <div
          className={`w-44 h-6 rounded-full border flex items-center justify-between px-2.5 transition-colors duration-300 ${
            light
              ? 'bg-white border-neutral-200 shadow-xs'
              : 'bg-[#141518] border-white/[0.09]'
          }`}
        >
          <span className="text-[8.5px] opacity-40">Search the web...</span>
          <span
            className={`w-3.5 h-3.5 rounded-full transition-colors duration-300 ${
              light ? 'bg-neutral-900' : 'bg-white'
            }`}
          />
        </div>
      </div>
    </div>
  );

  return (
    <motion.div
      layout
      transition={{ duration: 0.25, ease: EASE_OUT }}
      className={`relative w-full max-w-[390px] h-[144px] rounded-xl overflow-hidden border shadow-lg mb-6 transition-colors duration-300 ${
        resolvedIsLight
          ? 'border-neutral-200/90 shadow-black/[0.06]'
          : 'border-white/[0.1] shadow-black/50'
      }`}
    >
      {isSplitSystem ? (
        <div className="relative w-full h-full">
          <div className="absolute inset-0">{renderChromeSurface(false)}</div>
          <div
            className="absolute inset-0 border-r border-white/20"
            style={{ clipPath: 'inset(0 50% 0 0)' }}
          >
            {renderChromeSurface(true)}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-y-0 left-1/2 w-px bg-neutral-400/60 pointer-events-none"
          />
        </div>
      ) : (
        renderChromeSurface(resolvedIsLight)
      )}
    </motion.div>
  );
}

/** Choreographed Apple / Linear setup flow with live canvas theme morphing. */
export function Onboarding({ onComplete }: OnboardingProps) {
  const prefersReduced = Boolean(useReducedMotion());
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: light)').matches;
  });
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia'>('google');
  const [privacyShield, setPrivacyShield] = useState(true);

  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importedData, setImportedData] = useState<any[]>([]);
  const [isExiting, setIsExiting] = useState(false);

  const completedRef = useRef(false);
  const pendingPrefsRef = useRef({ theme, searchEngine, privacyShield, importedBookmarks: importedData });
  pendingPrefsRef.current = { theme, searchEngine, privacyShield, importedBookmarks: importedData };

  // Keep OS color scheme synchronized when theme === 'system'
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (e: MediaQueryListEvent) => setSystemPrefersLight(e.matches);
    setSystemPrefersLight(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const isLight = theme === 'light' || (theme === 'system' && systemPrefersLight);

  const commitFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    try {
      localStorage.setItem('nova_onboarding_complete', 'true');
    } catch (_) {}
    onComplete(pendingPrefsRef.current);
  }, [onComplete]);

  const handleFinish = useCallback(() => {
    if (isExiting || completedRef.current) return;
    setIsExiting(true);
    // Guarantee completion cleanly even if reduced motion skips transition callback
    const timer = setTimeout(commitFinish, prefersReduced ? 30 : 250);
    return () => clearTimeout(timer);
  }, [isExiting, commitFinish, prefersReduced]);

  const goNext = useCallback(() => {
    if (isExiting) return;
    setDir(1);
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else handleFinish();
  }, [isExiting, step, handleFinish]);

  const goBack = useCallback(() => {
    if (isExiting || step <= 0) return;
    setDir(-1);
    setStep((s) => s - 1);
  }, [isExiting, step]);

  const jumpToStep = useCallback(
    (targetStep: number) => {
      if (isExiting || targetStep === step) return;
      setDir(targetStep > step ? 1 : -1);
      setStep(targetStep);
    },
    [isExiting, step]
  );

  // Keyboard navigation across setup steps
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isExiting || isImporting) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === 'ArrowRight' && step < TOTAL_STEPS - 1) {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft' && step > 0) {
        e.preventDefault();
        goBack();
      } else if (step === 3 && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        e.preventDefault();
        const curIdx = SEARCH_ENGINES.findIndex((s) => s.id === searchEngine);
        const delta = e.key === 'ArrowDown' ? 1 : -1;
        const nextIdx = (curIdx + delta + SEARCH_ENGINES.length) % SEARCH_ENGINES.length;
        setSearchEngine(SEARCH_ENGINES[nextIdx].id);
      } else if (e.key === 'Enter') {
        const activeTag = document.activeElement?.tagName;
        if (activeTag === 'BUTTON' || activeTag === 'A') return;
        e.preventDefault();
        goNext();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExiting, isImporting, step, searchEngine, goNext, goBack]);

  const handleImport = async () => {
    const api = getElectronAPI();
    if (!api?.importChromeBookmarks) {
      setImportStatus('error');
      return;
    }
    setIsImporting(true);
    try {
      const res = await api.importChromeBookmarks();
      if (res?.success && res.bookmarks) {
        setImportedData(res.bookmarks);
        setImportStatus('success');
      } else {
        setImportStatus('error');
      }
    } catch {
      setImportStatus('error');
    } finally {
      setIsImporting(false);
    }
  };

  // Surface tokens synced live with selected theme
  const surfaceBg = isLight
    ? 'bg-white border-neutral-200/90'
    : 'bg-[#141518] border-white/[0.08]';
  const dividerColor = isLight ? 'divide-neutral-200/80' : 'divide-white/[0.07]';
  const primaryBtnClass = isLight
    ? 'bg-neutral-900 hover:bg-neutral-800 text-white'
    : 'bg-white hover:bg-neutral-200 text-neutral-950';
  const mutedText = isLight ? 'text-neutral-500' : 'text-neutral-400';
  const headingText = isLight ? 'text-neutral-950' : 'text-white';

  const stageVariants = {
    enter: (d: number) => ({
      x: prefersReduced ? 0 : d * 28,
      opacity: 0,
      scale: prefersReduced ? 1 : 0.985,
      filter: prefersReduced ? 'none' : 'blur(4px)',
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      filter: 'blur(0px)',
      transition: {
        duration: prefersReduced ? 0.01 : 0.3,
        ease: EASE_OUT,
        staggerChildren: prefersReduced ? 0 : 0.045,
      },
    },
    exit: (d: number) => ({
      x: prefersReduced ? 0 : d * -22,
      opacity: 0,
      scale: prefersReduced ? 1 : 0.99,
      filter: prefersReduced ? 'none' : 'blur(3px)',
      transition: { duration: prefersReduced ? 0.01 : 0.18, ease: EASE_OUT },
    }),
  };

  const itemVariants = {
    enter: { opacity: 0, y: prefersReduced ? 0 : 8 },
    center: {
      opacity: 1,
      y: 0,
      transition: { duration: prefersReduced ? 0.01 : 0.26, ease: EASE_OUT },
    },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  };

  const steps = [
    // Step 0 — Welcome
    <div
      key="welcome"
      className="flex flex-col items-center justify-center h-full text-center px-8 max-w-lg mx-auto"
    >
      <motion.div
        variants={itemVariants}
        initial={prefersReduced ? false : { opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 24, delay: 0.04 }}
        className={`w-20 h-20 rounded-2xl border p-2.5 flex items-center justify-center mb-7 shadow-sm transition-colors duration-300 ${surfaceBg}`}
      >
        <img src="./logo.svg" alt="Nova" className="w-full h-full object-contain" />
      </motion.div>

      <motion.h1
        variants={itemVariants}
        className={`text-4xl font-semibold mb-3 tracking-[-0.03em] leading-tight select-none transition-colors duration-300 ${headingText}`}
      >
        Welcome to Nova Browser
      </motion.h1>

      <motion.p
        variants={itemVariants}
        className={`${mutedText} text-sm max-w-sm leading-relaxed mb-8 select-none transition-colors duration-300`}
      >
        Choose your theme, search engine, and privacy defaults before you start.
      </motion.p>

      <motion.div variants={itemVariants}>
        <button
          type="button"
          onClick={goNext}
          className={`group inline-flex items-center gap-2 font-medium px-6 py-2.5 rounded-lg text-sm transition-colors no-drag cursor-pointer active:scale-[0.98] ${primaryBtnClass}`}
          style={NO_DRAG_STYLE}
        >
          <span>Let&apos;s Get Started</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </motion.div>
    </div>,

    // Step 1 — Import Data
    <div
      key="import"
      className="flex flex-col items-center justify-center h-full text-center px-8 max-w-md mx-auto"
    >
      <motion.div
        variants={itemVariants}
        className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-colors duration-300 ${surfaceBg} ${mutedText}`}
      >
        <Upload className="w-5 h-5" />
      </motion.div>

      <motion.h2
        variants={itemVariants}
        className={`text-2xl font-semibold tracking-[-0.02em] mb-2 select-none ${headingText}`}
      >
        Import from Chrome
      </motion.h2>

      <motion.p
        variants={itemVariants}
        className={`${mutedText} text-xs max-w-sm mb-7 leading-relaxed select-none`}
      >
        Bring your existing bookmarks from Google Chrome or Chromium-based browsers in one click.
      </motion.p>

      <motion.div variants={itemVariants} className="w-full flex flex-col items-center">
        <AnimatePresence mode="wait">
          {importStatus === 'idle' && (
            <motion.button
              key="import-idle"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: EASE_OUT }}
              type="button"
              onClick={handleImport}
              disabled={isImporting}
              className={`px-5 py-2.5 rounded-lg font-medium text-xs transition-colors mb-4 flex items-center gap-2 no-drag cursor-pointer disabled:opacity-50 ${primaryBtnClass}`}
              style={NO_DRAG_STYLE}
            >
              {isImporting ? (
                <div className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{isImporting ? 'Importing...' : 'Import Chrome Bookmarks'}</span>
            </motion.button>
          )}

          {importStatus === 'success' && (
            <motion.div
              key="import-success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="bg-emerald-500/10 text-emerald-500 px-4 py-2.5 rounded-lg font-medium mb-4 flex items-center gap-2 border border-emerald-500/20 text-xs no-drag select-none"
              style={NO_DRAG_STYLE}
            >
              <Check className="w-4 h-4" />
              <span>
                {importedData.length > 0
                  ? `${importedData.length} bookmarks imported successfully.`
                  : 'Bookmarks imported successfully.'}
              </span>
            </motion.div>
          )}

          {importStatus === 'error' && (
            <motion.div
              key="import-error"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex flex-col items-center gap-2 mb-4 no-drag"
              style={NO_DRAG_STYLE}
            >
              <div className="bg-red-500/10 text-red-500 px-4 py-2 rounded-lg font-medium border border-red-500/20 text-xs select-none">
                Chrome data could not be found or read.
              </div>
              <button
                type="button"
                onClick={handleImport}
                className={`text-[11px] font-medium underline underline-offset-4 cursor-pointer ${mutedText}`}
              >
                Try again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={goNext}
          className={`transition-colors text-xs no-drag cursor-pointer ${
            isLight ? 'text-neutral-500 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
          }`}
          style={NO_DRAG_STYLE}
        >
          {importStatus === 'success' ? 'Continue' : 'Skip for now'}
        </button>
      </motion.div>
    </div>,

    // Step 2 — Choose Appearance (Live Morphing Canvas + Live Mini Browser Preview)
    <div
      key="theme"
      className="flex flex-col items-center justify-center h-full text-center px-8 w-full max-w-xl mx-auto"
    >
      <motion.h2
        variants={itemVariants}
        className={`text-2xl font-semibold tracking-[-0.02em] mb-2 select-none ${headingText}`}
      >
        Choose Appearance
      </motion.h2>

      <motion.p variants={itemVariants} className={`${mutedText} text-xs mb-6 select-none`}>
        Pick a default look for Nova Browser. Watch the canvas respond instantly.
      </motion.p>

      <motion.div variants={itemVariants} className="w-full flex justify-center">
        <LiveBrowserThemePreview theme={theme} resolvedIsLight={isLight} />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-3 gap-2.5 w-full max-w-[390px] no-drag"
        style={NO_DRAG_STYLE}
      >
        {THEME_OPTIONS.map((opt) => {
          const active = theme === opt.id;
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={active}
              className={`relative flex flex-col items-center gap-1.5 py-3 px-2.5 rounded-xl border transition-colors no-drag cursor-pointer ${
                active
                  ? isLight
                    ? 'border-neutral-900 text-neutral-950'
                    : 'border-white text-white'
                  : isLight
                    ? 'border-neutral-200/90 bg-white text-neutral-600 hover:border-neutral-400'
                    : 'border-white/[0.08] bg-[#141518] text-neutral-400 hover:border-white/25 hover:text-neutral-200'
              }`}
              style={NO_DRAG_STYLE}
            >
              {active && (
                <motion.span
                  layoutId="onboarding-theme-active"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                  className={`absolute inset-0 rounded-[11px] ${
                    isLight ? 'bg-neutral-900/[0.05]' : 'bg-white/[0.08]'
                  }`}
                />
              )}
              <Icon className="relative w-4 h-4" />
              <span className="relative text-xs font-medium">{opt.name}</span>
              <span className={`relative text-[10px] ${mutedText}`}>{opt.subtitle}</span>
            </button>
          );
        })}
      </motion.div>
    </div>,

    // Step 3 — Default Search Engine
    <div
      key="search"
      className="flex flex-col items-center justify-center h-full text-center px-8 w-full max-w-lg mx-auto"
    >
      <motion.h2
        variants={itemVariants}
        className={`text-2xl font-semibold tracking-[-0.02em] mb-2 select-none ${headingText}`}
      >
        Default Search Engine
      </motion.h2>

      <motion.p variants={itemVariants} className={`${mutedText} text-xs mb-6 select-none`}>
        Used when typing queries directly into the address bar or New Tab page.
      </motion.p>

      <motion.div
        variants={itemVariants}
        className={`w-full rounded-xl border divide-y overflow-hidden no-drag transition-colors duration-300 ${surfaceBg} ${dividerColor}`}
        style={NO_DRAG_STYLE}
      >
        {SEARCH_ENGINES.map((engine) => {
          const active = searchEngine === engine.id;
          return (
            <button
              key={engine.id}
              type="button"
              onClick={() => setSearchEngine(engine.id)}
              aria-pressed={active}
              className={`relative w-full flex items-center gap-3.5 px-4 py-3 text-left transition-colors no-drag cursor-pointer ${
                isLight ? 'hover:bg-neutral-50' : 'hover:bg-white/[0.03]'
              }`}
              style={NO_DRAG_STYLE}
            >
              {active && (
                <motion.span
                  layoutId="onboarding-search-active"
                  aria-hidden="true"
                  transition={{ type: 'spring', stiffness: 520, damping: 38, mass: 0.6 }}
                  className={`absolute inset-0 ${
                    isLight ? 'bg-neutral-100/90' : 'bg-white/[0.07]'
                  }`}
                />
              )}
              <div className="relative w-6 h-6 flex items-center justify-center shrink-0">
                {engine.icon}
              </div>
              <div className="relative flex-1 min-w-0">
                <div className={`font-medium text-xs ${headingText}`}>{engine.name}</div>
                <div className={`text-[11px] ${mutedText}`}>{engine.desc}</div>
              </div>
              <span
                className={`relative w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                  active
                    ? isLight
                      ? 'bg-neutral-900 border-neutral-900 text-white'
                      : 'bg-white border-white text-neutral-950'
                    : isLight
                      ? 'border-neutral-300'
                      : 'border-white/20'
                }`}
              >
                <AnimatePresence>
                  {active && (
                    <motion.span
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.4, opacity: 0 }}
                      transition={{ duration: 0.14, ease: EASE_OUT }}
                    >
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </motion.div>
    </div>,

    // Step 4 — Privacy Shield
    <div
      key="privacy"
      className="flex flex-col items-center justify-center h-full text-center px-8 w-full max-w-md mx-auto"
    >
      <motion.div
        variants={itemVariants}
        animate={{ scale: privacyShield ? 1 : 0.94 }}
        transition={{ type: 'spring', stiffness: 420, damping: 28 }}
        className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 transition-colors duration-300 ${
          privacyShield
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-500'
            : `${surfaceBg} ${mutedText}`
        }`}
      >
        <Shield className="w-5 h-5" />
      </motion.div>

      <motion.h2
        variants={itemVariants}
        className={`text-2xl font-semibold tracking-[-0.02em] mb-2 select-none ${headingText}`}
      >
        Privacy Shield
      </motion.h2>

      <motion.p
        variants={itemVariants}
        className={`${mutedText} text-xs max-w-sm mb-6 leading-relaxed select-none`}
      >
        Built-in network filtering blocks intrusive ads, trackers, and malicious domains.
      </motion.p>

      {/* Clean hairline filter matrix */}
      <motion.div
        variants={itemVariants}
        className={`w-full rounded-xl border divide-y overflow-hidden mb-4 transition-colors duration-300 ${surfaceBg} ${dividerColor}`}
      >
        {[
          { icon: Ban, label: 'Intrusive Ads' },
          { icon: EyeOff, label: 'Cross-site Trackers' },
          { icon: Bug, label: 'Malware & Phishing' },
        ].map(({ icon: Icon, label }) => (
          <div key={label} className="px-4 py-2.5 flex items-center justify-between text-xs">
            <span className={`flex items-center gap-2.5 font-medium ${headingText}`}>
              <Icon className={`w-3.5 h-3.5 ${mutedText}`} />
              <span>{label}</span>
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={privacyShield ? 'blocked' : 'allowed'}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.14, ease: EASE_OUT }}
                className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                  privacyShield ? 'text-emerald-500' : 'text-red-500'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`w-1.5 h-1.5 rounded-full ${
                    privacyShield ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                />
                <span>{privacyShield ? 'Blocked' : 'Allowed'}</span>
              </motion.span>
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className={`w-full px-4 py-3 rounded-xl border flex items-center justify-between no-drag transition-colors duration-300 ${surfaceBg}`}
        style={NO_DRAG_STYLE}
      >
        <span className={`font-medium text-xs select-none ${headingText}`}>
          {privacyShield ? 'Privacy Shield Active' : 'Privacy Shield Off'}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={privacyShield}
          aria-label="Toggle Privacy Shield"
          onClick={() => setPrivacyShield((p) => !p)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full p-[3px] transition-colors cursor-pointer ${
            privacyShield
              ? isLight
                ? 'bg-neutral-900 justify-end'
                : 'bg-white justify-end'
              : isLight
                ? 'bg-neutral-200 justify-start'
                : 'bg-white/[0.14] justify-start'
          }`}
          style={NO_DRAG_STYLE}
        >
          <motion.span
            layout
            transition={{ type: 'spring', stiffness: 540, damping: 32 }}
            className={`inline-block h-3.5 w-3.5 rounded-full ${
              privacyShield
                ? isLight
                  ? 'bg-white'
                  : 'bg-neutral-950'
                : isLight
                  ? 'bg-white'
                  : 'bg-neutral-200'
            }`}
          />
        </button>
      </motion.div>
    </div>,

    // Step 5 — Done
    <div
      key="done"
      className="flex flex-col items-center justify-center h-full text-center px-8 max-w-md mx-auto"
    >
      <motion.div
        variants={itemVariants}
        initial={prefersReduced ? false : { scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 24 }}
        className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${primaryBtnClass}`}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <motion.path
            d="M20 6 9 17l-5-5"
            initial={prefersReduced ? { pathLength: 1 } : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: prefersReduced ? 0.01 : 0.42, delay: 0.1, ease: EASE_OUT }}
          />
        </svg>
      </motion.div>

      <motion.h2
        variants={itemVariants}
        className={`text-2xl font-semibold tracking-[-0.02em] mb-2 select-none ${headingText}`}
      >
        You&apos;re all set
      </motion.h2>

      <motion.p variants={itemVariants} className={`${mutedText} text-xs max-w-sm leading-relaxed mb-6 select-none`}>
        Your preferences are saved and can be changed anytime from Settings.
      </motion.p>

      {/* Clean typographic hairline summary */}
      <motion.div
        variants={itemVariants}
        className={`flex items-center gap-3 px-4 py-2.5 border-y mb-7 text-xs ${mutedText} select-none ${
          isLight ? 'border-neutral-200/80' : 'border-white/[0.08]'
        }`}
      >
        <span>
          Theme: <strong className={`font-medium capitalize ${headingText}`}>{theme}</strong>
        </span>
        <span className="opacity-30">·</span>
        <span>
          Search: <strong className={`font-medium capitalize ${headingText}`}>{searchEngine}</strong>
        </span>
        <span className="opacity-30">·</span>
        <span>
          Shield:{' '}
          <strong className={privacyShield ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
            {privacyShield ? 'On' : 'Off'}
          </strong>
        </span>
      </motion.div>

      <motion.div variants={itemVariants}>
        <button
          type="button"
          onClick={handleFinish}
          className={`group inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm transition-colors no-drag cursor-pointer active:scale-[0.98] ${primaryBtnClass}`}
          style={NO_DRAG_STYLE}
        >
          <span>Start Browsing</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </motion.div>
    </div>,
  ];

  const isSetupStep = step > 0 && step < TOTAL_STEPS - 1;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={
        isExiting
          ? {
              opacity: 0,
              scale: prefersReduced ? 1 : 1.015,
              filter: prefersReduced ? 'none' : 'blur(4px)',
            }
          : { opacity: 1, scale: 1, filter: 'blur(0px)' }
      }
      transition={{ duration: prefersReduced ? 0.01 : isExiting ? 0.22 : 0.24, ease: EASE_OUT }}
      onAnimationComplete={() => {
        if (isExiting) commitFinish();
      }}
      className={`fixed inset-0 z-[9999] flex flex-col overflow-hidden drag-region select-none transition-colors duration-300 ease-out ${
        isLight ? 'bg-[#fbfbfc] text-neutral-900' : 'bg-[#0b0c0e] text-neutral-100'
      }`}
      style={DRAG_STYLE}
    >
      {/* Top Window Drag Header with macOS Traffic Light Spacing */}
      <div
        className={`w-full h-11 flex items-center justify-between px-4 shrink-0 drag-region z-50 select-none border-b transition-colors duration-300 ${
          isLight ? 'border-neutral-200/80' : 'border-white/[0.06]'
        }`}
        style={DRAG_STYLE}
      >
        <div className="flex items-center gap-2 pl-20 no-drag" style={NO_DRAG_STYLE}>
          <span className={`text-[11px] font-medium tracking-wide ${mutedText}`}>
            Nova Browser Setup
          </span>
        </div>
        <div className="flex items-center gap-2 no-drag" style={NO_DRAG_STYLE}>
          <button
            type="button"
            onClick={handleFinish}
            className={`text-xs transition-colors px-2.5 py-1 rounded-md cursor-pointer no-drag select-none font-medium ${
              isLight
                ? 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200/60'
                : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
            }`}
            style={NO_DRAG_STYLE}
          >
            Skip Setup
          </button>
        </div>
      </div>

      {/* Always-mounted progress track (prevents layout jump between steps) */}
      <div
        className={`w-full h-[2px] shrink-0 pointer-events-none transition-opacity duration-200 ${
          isLight ? 'bg-neutral-200/80' : 'bg-white/[0.06]'
        } ${isSetupStep ? 'opacity-100' : 'opacity-0'}`}
      >
        <motion.div
          className={`h-full origin-left ${isLight ? 'bg-neutral-900' : 'bg-white'}`}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: step / (TOTAL_STEPS - 1) }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        />
      </div>

      {/* Centered Choreographed Stage */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center drag-region"
        style={DRAG_STYLE}
      >
        <AnimatePresence custom={dir} mode="wait" initial={false}>
          <motion.div
            key={step}
            custom={dir}
            variants={stageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="absolute inset-0 flex items-center justify-center drag-region"
            style={DRAG_STYLE}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Always-mounted footer bar (keeps vertical stage center rock-steady across every step) */}
      <div
        className={`h-16 flex justify-between items-center px-8 sm:px-10 shrink-0 drag-region transition-opacity duration-200 ${
          isSetupStep ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        style={DRAG_STYLE}
      >
        <button
          type="button"
          onClick={goBack}
          tabIndex={isSetupStep ? 0 : -1}
          className={`font-medium px-3 py-1.5 rounded-lg text-xs transition-colors no-drag cursor-pointer ${
            isLight
              ? 'text-neutral-500 hover:text-neutral-950 hover:bg-neutral-200/60'
              : 'text-neutral-400 hover:text-white hover:bg-white/[0.06]'
          }`}
          style={NO_DRAG_STYLE}
        >
          Back
        </button>

        {/* Interactive step pills */}
        <div
          className="flex items-center gap-1.5 no-drag"
          role="group"
          aria-label="Setup steps"
          style={NO_DRAG_STYLE}
        >
          {Array.from({ length: TOTAL_STEPS - 2 }).map((_, i) => {
            const targetStep = i + 1;
            const active = targetStep === step;
            const completed = targetStep < step;
            return (
              <button
                key={targetStep}
                type="button"
                tabIndex={isSetupStep ? 0 : -1}
                aria-label={`Go to step ${targetStep}`}
                aria-current={active ? 'step' : undefined}
                onClick={() => jumpToStep(targetStep)}
                className="p-1 cursor-pointer no-drag"
                style={NO_DRAG_STYLE}
              >
                <motion.span
                  animate={{
                    width: active ? 20 : 6,
                    opacity: active ? 1 : completed ? 0.55 : 0.2,
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 34 }}
                  className={`block h-1.5 rounded-full ${
                    isLight ? 'bg-neutral-900' : 'bg-white'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={goNext}
          tabIndex={isSetupStep ? 0 : -1}
          className={`group inline-flex items-center gap-1.5 px-5 py-2 rounded-lg font-medium text-xs transition-colors active:scale-[0.98] no-drag cursor-pointer ${primaryBtnClass}`}
          style={NO_DRAG_STYLE}
        >
          <span>{step === TOTAL_STEPS - 2 ? 'Complete' : 'Next'}</span>
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}
