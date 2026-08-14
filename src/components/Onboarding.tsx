import React, { useState } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { 
  Sun, Moon, Monitor, Search, Shield, ShieldCheck, Check, 
  ArrowRight, ArrowLeft, Download, Sparkles, Zap, Lock, 
  Sliders, CheckCircle2, AlertCircle, RefreshCw, Layers
} from 'lucide-react';

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
    desc: 'Most comprehensive search engine with global indexing',
    badge: 'Popular',
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
    ),
  },
  {
    id: 'duckduckgo' as const,
    name: 'DuckDuckGo',
    desc: 'Privacy-focused search without search history tracking',
    badge: 'Private',
    icon: (
      <div className="w-6 h-6 rounded-full bg-[#DE5833] flex items-center justify-center">
        <Shield className="w-3.5 h-3.5 text-white" />
      </div>
    ),
  },
  {
    id: 'brave' as const,
    name: 'Brave Search',
    desc: 'Independent web index with zero tracking and ad-free results',
    badge: 'Independent',
    icon: (
      <div className="w-6 h-6 rounded-full bg-[#FB542B] flex items-center justify-center">
        <Search className="w-3.5 h-3.5 text-white" />
      </div>
    ),
  },
  {
    id: 'bing' as const,
    name: 'Microsoft Bing',
    desc: 'Intelligent search augmented with deep generative answers',
    badge: 'Copilot',
    icon: (
      <svg viewBox="0 0 48 48" className="w-6 h-6">
        <path fill="#0078D4" d="M10 5l8 3v26l-8-5z"/>
        <path fill="#00B4F0" d="M18 8l14 8-14 9z"/>
        <path fill="#FFB900" d="M18 25l14-9 6 18z"/>
        <path fill="#0078D4" d="M18 25v9l20 9-6-18z"/>
      </svg>
    ),
  },
  {
    id: 'ecosia' as const,
    name: 'Ecosia',
    desc: 'Eco-conscious search engine funding tree planting initiatives',
    badge: 'Eco',
    icon: (
      <div className="w-6 h-6 rounded-full bg-[#00894A] flex items-center justify-center">
        <Search className="w-3.5 h-3.5 text-white" />
      </div>
    ),
  },
];

const THEMES = [
  {
    id: 'dark' as const,
    name: 'Dark OLED',
    desc: 'Deep blacks, vibrant contrast, easy on the eyes',
    icon: Moon,
    previewBg: 'bg-[#0a0d14]',
    barBg: 'bg-[#121824] border-b border-white/10',
    contentBg: 'bg-[#0f1420]',
    dotBg: 'bg-blue-400',
  },
  {
    id: 'light' as const,
    name: 'Clean Light',
    desc: 'Crisp, high clarity for bright environments',
    icon: Sun,
    previewBg: 'bg-white',
    barBg: 'bg-slate-100 border-b border-slate-200',
    contentBg: 'bg-slate-50',
    dotBg: 'bg-blue-600',
  },
  {
    id: 'system' as const,
    name: 'System Dynamic',
    desc: 'Automatically synchronizes with your OS appearance',
    icon: Monitor,
    previewBg: 'bg-gradient-to-r from-white to-[#0a0d14]',
    barBg: 'bg-gradient-to-r from-slate-100 to-[#121824] border-b border-white/10',
    contentBg: 'bg-gradient-to-r from-slate-50 to-[#0f1420]',
    dotBg: 'bg-indigo-400',
  },
];

const TOTAL_STEPS = 6;

const contentVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 30 : -30,
    opacity: 0,
    scale: 0.98,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.35,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -30 : 30,
    opacity: 0,
    scale: 0.98,
    transition: {
      duration: 0.25,
    },
  }),
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: (typeof i === 'number' ? i : 0) * 0.07 + 0.1,
      duration: 0.4,
    },
  }),
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia'>('google');
  const [privacyShield, setPrivacyShield] = useState(true);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importedCount, setImportedCount] = useState(0);
  const [importedData, setImportedData] = useState<any[]>([]);

  const goNext = () => {
    setDir(1);
    if (step < TOTAL_STEPS - 1) setStep(s => s + 1);
    else handleFinish();
  };

  const goBack = () => {
    setDir(-1);
    setStep(s => s - 1);
  };

  const handleFinish = () => {
    localStorage.setItem('nova_onboarding_complete', 'true');
    onComplete({ theme, searchEngine, privacyShield, importedBookmarks: importedData });
  };

  const handleImport = async () => {
    if (!(window as any).electronAPI?.importChromeBookmarks) return;
    setIsImporting(true);
    try {
      const res = await (window as any).electronAPI.importChromeBookmarks();
      if (res && res.success && Array.isArray(res.bookmarks)) {
        setImportedData(res.bookmarks);
        setImportedCount(res.bookmarks.length);
        setImportStatus('success');
      } else {
        setImportStatus('error');
      }
    } catch (err) {
      setImportStatus('error');
    }
    setIsImporting(false);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-[#06080e] text-slate-100 flex flex-col items-center justify-center select-none overflow-hidden font-sans">
      {/* Ambient Aurora Glow Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.25, 0.4, 0.25],
            x: [0, 30, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-blue-600/30 blur-[130px]"
        />
        <motion.div 
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-600/25 blur-[140px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
        
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Drag Region for macOS */}
      <div className="absolute top-0 left-0 right-0 h-10 z-50" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />

      {/* Main Floating Glass Container */}
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-2xl mx-4 bg-[#0c101a]/80 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-[0_24px_70px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden z-10 min-h-[580px]"
      >
        {/* Top Header & Step Indicator */}
        <div className="px-8 pt-7 pb-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-white/90">Nova Browser</span>
          </div>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step 
                    ? 'w-6 bg-gradient-to-r from-blue-400 to-indigo-500 shadow-xs shadow-blue-500/50' 
                    : i < step 
                    ? 'w-2 bg-white/40' 
                    : 'w-1.5 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Step Body Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-[400px]">
          <AnimatePresence custom={dir} mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                {/* Glowing Logo Badge */}
                <motion.div
                  custom={0}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="relative mb-6"
                >
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 p-[1.5px] shadow-2xl shadow-blue-500/30 flex items-center justify-center">
                    <div className="w-full h-full rounded-[14px] bg-[#0c101a] flex items-center justify-center overflow-hidden">
                      <Zap className="w-10 h-10 text-blue-400 fill-blue-400/20" />
                    </div>
                  </div>
                </motion.div>

                {/* Subtitle Badge */}
                <motion.div
                  custom={1}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Next-Generation Architecture</span>
                </motion.div>

                {/* Headline */}
                <motion.h1
                  custom={2}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3"
                >
                  Welcome to <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400">Nova Browser</span>
                </motion.h1>

                {/* Description */}
                <motion.p
                  custom={3}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  className="text-slate-400 text-sm sm:text-base leading-relaxed mb-8 max-w-md"
                >
                  Experience the web with zero-latency on-device AI, built-in privacy protection, and a fluid workspace designed for deep focus.
                </motion.p>

                {/* Primary Button */}
                <motion.button
                  custom={4}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={goNext}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer"
                >
                  <span>Start Configuration</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10">
                  <Download className="w-6 h-6" />
                </motion.div>

                <motion.h2 custom={1} variants={itemVariants} initial="hidden" animate="visible" className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                  Import Your Bookmarks
                </motion.h2>

                <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible" className="text-slate-400 text-sm mb-6 max-w-md leading-relaxed">
                  Seamlessly transfer your bookmarks and favorites from Google Chrome with one click.
                </motion.p>

                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="w-full max-w-sm flex flex-col items-center gap-3 mb-6">
                  {importStatus === 'idle' && (
                    <button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="w-full py-3 px-5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all shadow-sm cursor-pointer"
                    >
                      {isImporting ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      ) : (
                        <Download className="w-4 h-4 text-blue-400" />
                      )}
                      <span>{isImporting ? 'Reading Chrome database...' : 'Import Chrome Bookmarks'}</span>
                    </button>
                  )}

                  {importStatus === 'success' && (
                    <div className="w-full p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Successfully imported {importedCount} bookmarks</span>
                    </div>
                  )}

                  {importStatus === 'error' && (
                    <div className="w-full p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Chrome profile was not found. You can import later.</span>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/10">
                  <Sliders className="w-6 h-6" />
                </motion.div>

                <motion.h2 custom={1} variants={itemVariants} initial="hidden" animate="visible" className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                  Select Visual Theme
                </motion.h2>

                <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible" className="text-slate-400 text-sm mb-6 max-w-md">
                  Choose an interface style tailored for your workspace lighting.
                </motion.p>

                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3.5 w-full mb-2">
                  {THEMES.map((t) => {
                    const IconComponent = t.icon;
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`group relative flex flex-col items-center p-3.5 rounded-2xl border transition-all text-left cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-500/15 border-blue-500/60 ring-1 ring-blue-500/50 shadow-md shadow-blue-500/10' 
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        {/* Mini browser wireframe preview */}
                        <div className={`w-full h-16 rounded-lg overflow-hidden border border-white/10 ${t.previewBg} mb-3 flex flex-col shadow-inner`}>
                          <div className={`h-3.5 ${t.barBg} flex items-center gap-1 px-1.5`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${t.dotBg} opacity-80`} />
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                            <div className="w-1 h-1 rounded-full bg-white/20" />
                          </div>
                          <div className="flex-1 p-1.5 flex gap-1">
                            <div className={`w-1/3 h-full rounded ${t.contentBg}`} />
                            <div className={`flex-1 h-full rounded ${t.contentBg}`} />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 mb-1">
                          <IconComponent className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-white">{t.name}</span>
                        </div>

                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step-3"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-5 shadow-lg shadow-blue-500/10">
                  <Search className="w-6 h-6" />
                </motion.div>

                <motion.h2 custom={1} variants={itemVariants} initial="hidden" animate="visible" className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                  Default Search Engine
                </motion.h2>

                <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible" className="text-slate-400 text-sm mb-5 max-w-md">
                  Choose your default omnibox provider. You can adjust this anytime in settings.
                </motion.p>

                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="flex flex-col gap-2 w-full max-h-[220px] overflow-y-auto pr-1">
                  {SEARCH_ENGINES.map((engine) => {
                    const isSelected = searchEngine === engine.id;
                    return (
                      <button
                        key={engine.id}
                        onClick={() => setSearchEngine(engine.id)}
                        className={`flex items-center gap-3.5 p-3 rounded-xl border transition-all text-left cursor-pointer ${
                          isSelected
                            ? 'bg-blue-500/15 border-blue-500/60 ring-1 ring-blue-500/40 shadow-xs'
                            : 'bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          {engine.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-white truncate">{engine.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-medium">
                              {engine.badge}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate">{engine.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-white/30'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="step-4"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible" className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-5 shadow-lg shadow-emerald-500/10">
                  <ShieldCheck className="w-7 h-7" />
                </motion.div>

                <motion.h2 custom={1} variants={itemVariants} initial="hidden" animate="visible" className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                  Nova Privacy Shield
                </motion.h2>

                <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible" className="text-slate-400 text-sm mb-6 max-w-md leading-relaxed">
                  Engine-level ad blocking and tracker mitigation to keep browsing fast and confidential.
                </motion.p>

                {/* 3 Pillars of Protection */}
                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3 w-full mb-6">
                  {[
                    { title: 'Ad Blocker', desc: 'Banners & video popups', icon: Zap },
                    { title: 'Anti-Tracking', desc: 'Fingerprinting blocks', icon: Lock },
                    { title: 'Malware Guard', desc: 'Phishing containment', icon: Shield },
                  ].map((p) => {
                    const PillarIcon = p.icon;
                    return (
                      <div key={p.title} className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col items-center text-center">
                        <PillarIcon className="w-4 h-4 text-emerald-400 mb-2" />
                        <span className="text-xs font-semibold text-white mb-0.5">{p.title}</span>
                        <span className="text-[11px] text-slate-400 leading-tight">{p.desc}</span>
                      </div>
                    );
                  })}
                </motion.div>

                {/* Interactive Toggle Pill */}
                <motion.div 
                  custom={4} 
                  variants={itemVariants} 
                  initial="hidden" 
                  animate="visible"
                  onClick={() => setPrivacyShield(!privacyShield)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className={`w-9 h-5 rounded-full transition-colors duration-200 p-0.5 ${privacyShield ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${privacyShield ? 'translate-x-4' : 'translate-x-0'}`} />
                  </div>
                  <span className="text-xs font-semibold text-white">
                    {privacyShield ? 'Privacy Shield Enabled' : 'Privacy Shield Disabled'}
                  </span>
                </motion.div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step-5"
                custom={dir}
                variants={contentVariants}
                initial="enter"
                animate="center"
                exit="exit"
                className="w-full flex flex-col items-center text-center max-w-lg"
              >
                <motion.div 
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-5 shadow-2xl shadow-emerald-500/30 text-white"
                >
                  <Check className="w-8 h-8 stroke-[3]" />
                </motion.div>

                <motion.h2 custom={1} variants={itemVariants} initial="hidden" animate="visible" className="text-2xl sm:text-3xl font-bold text-white mb-2 tracking-tight">
                  You're All Set
                </motion.h2>

                <motion.p custom={2} variants={itemVariants} initial="hidden" animate="visible" className="text-slate-400 text-sm mb-6 max-w-md leading-relaxed">
                  Your customized environment is prepared and ready.
                </motion.p>

                {/* Configuration Summary Badges */}
                <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="flex flex-wrap items-center justify-center gap-2 mb-8">
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                    Theme: <strong className="text-white capitalize">{theme}</strong>
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                    Search: <strong className="text-white capitalize">{searchEngine}</strong>
                  </span>
                  <span className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium">
                    Shield: <strong className={privacyShield ? 'text-emerald-400' : 'text-slate-400'}>{privacyShield ? 'Active' : 'Off'}</strong>
                  </span>
                </motion.div>

                {/* Launch Button */}
                <motion.button
                  custom={4}
                  variants={itemVariants}
                  initial="hidden"
                  animate="visible"
                  onClick={handleFinish}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-600 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all cursor-pointer"
                >
                  <span>Launch Nova Browser</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Navigation Bar */}
        {step > 0 && step < TOTAL_STEPS - 1 && (
          <div className="px-8 py-4 border-t border-white/5 flex items-center justify-between bg-black/20">
            <button
              onClick={goBack}
              className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-3">
              {step === 1 && importStatus === 'idle' && (
                <button
                  onClick={goNext}
                  className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer py-1.5 px-3"
                >
                  Skip
                </button>
              )}
              <button
                onClick={goNext}
                className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
