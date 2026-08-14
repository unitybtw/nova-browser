import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sun, Moon, Monitor, Search, Shield, Ban, EyeOff, Bug, 
  ArrowRight, ArrowLeft, Check, Sparkles, Download, 
  Layers, Lock, Cpu, Globe, Flame
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
    desc: 'Comprehensive web indexing & search',
    color: '#4285F4',
    icon: (
      <svg viewBox="0 0 48 48" className="w-7 h-7">
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
    desc: 'Privacy by design, zero search tracking',
    color: '#DE5833',
    icon: (
      <div className="w-7 h-7 rounded-full bg-[#DE5833] flex items-center justify-center shadow-md">
        <Shield className="w-4 h-4 text-white" />
      </div>
    ),
  },
  {
    id: 'brave' as const,
    name: 'Brave Search',
    desc: 'Independent privacy-focused index',
    color: '#FB542B',
    icon: (
      <div className="w-7 h-7 rounded-full bg-[#FB542B] flex items-center justify-center shadow-md">
        <Search className="w-4 h-4 text-white" />
      </div>
    ),
  },
  {
    id: 'bing' as const,
    name: 'Bing',
    desc: 'Powered by Microsoft Copilot AI',
    color: '#0078D4',
    icon: (
      <svg viewBox="0 0 48 48" className="w-7 h-7">
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
    desc: 'Eco-friendly search that plants trees',
    color: '#00894A',
    icon: (
      <div className="w-7 h-7 rounded-full bg-[#00894A] flex items-center justify-center shadow-md">
        <Search className="w-4 h-4 text-white" />
      </div>
    ),
  },
];

const THEMES = [
  {
    id: 'light' as const,
    name: 'Light',
    desc: 'Clean & Crisp',
    icon: <Sun className="w-5 h-5 text-amber-400" />,
    previewBg: 'bg-slate-100 border border-slate-300',
    barBg: 'bg-white border-b border-slate-200',
    dotColor: 'bg-slate-400',
    accentColor: 'from-amber-400 to-orange-500',
  },
  {
    id: 'dark' as const,
    name: 'Dark',
    desc: 'OLED Pure Black',
    icon: <Moon className="w-5 h-5 text-indigo-400" />,
    previewBg: 'bg-[#0B0F17] border border-slate-800',
    barBg: 'bg-slate-900 border-b border-slate-800',
    dotColor: 'bg-slate-600',
    accentColor: 'from-indigo-500 to-purple-600',
  },
  {
    id: 'system' as const,
    name: 'System',
    desc: 'Auto Match OS',
    icon: <Monitor className="w-5 h-5 text-cyan-400" />,
    previewBg: 'bg-gradient-to-br from-slate-200 via-slate-700 to-slate-950 border border-slate-500',
    barBg: 'bg-gradient-to-r from-white via-slate-800 to-slate-900',
    dotColor: 'bg-slate-400',
    accentColor: 'from-cyan-500 to-blue-600',
  },
];

const TOTAL_STEPS = 6;

// Motion animations
const pageVariants: any = {
  enter: (dir: number) => ({
    x: dir > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.97,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.97,
    filter: 'blur(4px)',
    transition: {
      duration: 0.35,
      ease: [0.16, 1, 0.3, 1],
    },
  }),
};

const itemVariants: any = {
  enter: { y: 20, opacity: 0, scale: 0.96 },
  center: { 
    y: 0, 
    opacity: 1, 
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 26 }
  },
  exit: { y: -15, opacity: 0, transition: { duration: 0.2 } },
};

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [searchEngine, setSearchEngine] = useState<'google' | 'duckduckgo' | 'bing' | 'brave' | 'ecosia'>('google');
  const [privacyShield, setPrivacyShield] = useState(true);
  
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importedData, setImportedData] = useState<any[]>([]);

  // Keyboard Navigation Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        goNext();
      } else if (e.key === 'ArrowRight' && step < TOTAL_STEPS - 1) {
        goNext();
      } else if (e.key === 'ArrowLeft' && step > 0) {
        goBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, theme, searchEngine, privacyShield, importedData]);

  const goNext = () => {
    setDir(1);
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    } else {
      handleFinish();
    }
  };

  const goBack = () => {
    if (step > 0) {
      setDir(-1);
      setStep(s => s - 1);
    }
  };

  const handleFinish = () => {
    try {
      localStorage.setItem('nova_onboarding_complete', 'true');
    } catch (e) {}
    onComplete({ theme, searchEngine, privacyShield, importedBookmarks: importedData });
  };

  const handleImport = async () => {
    if (!(window as any).electronAPI?.importChromeBookmarks) return;
    setIsImporting(true);
    try {
      const res = await (window as any).electronAPI.importChromeBookmarks();
      if (res.success && res.bookmarks) {
        setImportedData(res.bookmarks);
        setImportStatus('success');
      } else {
        setImportStatus('error');
      }
    } catch (err) {
      setImportStatus('error');
    }
    setIsImporting(false);
  };

  // Dynamic Theme Colors for background aura based on step
  const stepGradients = [
    'from-blue-600/30 via-indigo-600/20 to-purple-600/30', // 0: Welcome
    'from-cyan-600/30 via-blue-600/20 to-indigo-600/30',   // 1: Import
    theme === 'light' 
      ? 'from-amber-500/25 via-orange-500/20 to-yellow-500/20' 
      : theme === 'dark' 
      ? 'from-indigo-600/30 via-purple-600/25 to-slate-900/50' 
      : 'from-blue-600/30 via-indigo-600/20 to-cyan-600/30', // 2: Theme
    'from-sky-600/30 via-blue-600/20 to-violet-600/30',    // 3: Search
    'from-emerald-600/35 via-teal-600/20 to-cyan-600/30',   // 4: Shield
    'from-violet-600/35 via-fuchsia-600/25 to-blue-600/35', // 5: Finish
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#05070E] select-none flex flex-col justify-between overflow-hidden text-slate-100 font-sans">
      
      {/* Draggable macOS Top Bar Area */}
      <div 
        className="absolute top-0 left-0 right-0 h-11 z-50 pointer-events-auto" 
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} 
      />

      {/* Cinematic Ambient Glow Background with Spring Animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Animated Radial Orb 1 */}
        <motion.div
          animate={{
            x: [0, 40, -30, 0],
            y: [0, -30, 40, 0],
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -top-32 -left-32 w-[38rem] h-[38rem] rounded-full blur-[120px] transition-colors duration-1000 bg-gradient-to-br ${stepGradients[step]}`}
        />

        {/* Animated Radial Orb 2 */}
        <motion.div
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 40, -40, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full blur-[130px] transition-colors duration-1000 bg-gradient-to-tl ${stepGradients[step]}`}
        />

        {/* Subtle Cyber Grid Background Layer */}
        <div 
          className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:4rem_4rem]" 
        />
      </div>

      {/* Top Header & Smooth Progress Bar */}
      <div className="relative z-40 w-full pt-4 px-8">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
              <span className="text-xs font-black text-white tracking-widest">N</span>
            </div>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Setup Experience</span>
          </div>

          {/* Staggered Interactive Step Indicators */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <motion.div
                key={i}
                layout
                onClick={() => {
                  if (i <= step) {
                    setDir(i > step ? 1 : -1);
                    setStep(i);
                  }
                }}
                className={`h-1.5 rounded-full cursor-pointer transition-all duration-300 ${
                  i === step 
                    ? 'w-8 bg-gradient-to-r from-blue-500 to-indigo-500 shadow-sm shadow-blue-500/50' 
                    : i < step 
                    ? 'w-2 bg-blue-500/60 hover:bg-blue-400' 
                    : 'w-2 bg-white/10 hover:bg-white/20'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Continuous Micro Progress Strip */}
        <div className="w-full max-w-xl mx-auto h-[2px] bg-white/5 mt-3 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>

      {/* Main Content Area with Fluid Step Swapping */}
      <div className="relative z-30 flex-1 flex items-center justify-center px-6 py-4 max-w-2xl w-full mx-auto overflow-hidden">
        <AnimatePresence custom={dir} mode="wait">
          
          {/* STEP 0: WELCOME HERO */}
          {step === 0 && (
            <motion.div
              key="step-0"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Floating Levitation Icon */}
              <motion.div
                variants={itemVariants}
                animate={{ y: [-4, 6, -4] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="relative mb-6 group cursor-default"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-violet-600 rounded-3xl blur-2xl opacity-50 group-hover:opacity-80 transition-opacity duration-700" />
                <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-slate-800/90 to-slate-950/90 border border-white/15 shadow-2xl flex items-center justify-center backdrop-blur-2xl p-4">
                  <img 
                    src="/nova-icon-pure.png" 
                    alt="Nova Icon" 
                    className="w-16 h-16 object-contain drop-shadow-xl"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} 
                  />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full border-2 border-slate-900 animate-pulse shadow-md" />
                </div>
              </motion.div>

              {/* Title & Subtitle */}
              <motion.h1 
                variants={itemVariants} 
                className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-3"
              >
                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-400">Nova Browser</span>
              </motion.h1>

              <motion.p 
                variants={itemVariants} 
                className="text-slate-300 text-base sm:text-lg max-w-md mb-8 leading-relaxed font-normal"
              >
                Supercharged speed, uncompromising privacy, and built-in AI copilots. Let's tailor it to your workflow in seconds.
              </motion.p>

              {/* Feature Pills */}
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-2.5 mb-10">
                {[
                  { icon: <Flame className="w-3.5 h-3.5 text-amber-400" />, text: "10x Fast Startup" },
                  { icon: <Shield className="w-3.5 h-3.5 text-emerald-400" />, text: "Zero Telemetry" },
                  { icon: <Cpu className="w-3.5 h-3.5 text-cyan-400" />, text: "Native 4K Wallpapers" },
                ].map((tag, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300 backdrop-blur-md shadow-sm">
                    {tag.icon}
                    <span>{tag.text}</span>
                  </div>
                ))}
              </motion.div>

              {/* Get Started Button */}
              <motion.button
                variants={itemVariants}
                onClick={goNext}
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px rgba(59, 130, 246, 0.4)" }}
                whileTap={{ scale: 0.96 }}
                className="group flex items-center gap-3 px-9 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-base shadow-xl shadow-blue-600/30 transition-all border border-white/20"
              >
                <span>Let's Get Started</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          )}

          {/* STEP 1: IMPORT FROM OLD BROWSER */}
          {step === 1 && (
            <motion.div
              key="step-1"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              <motion.div 
                variants={itemVariants} 
                className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4 text-blue-400 shadow-xl shadow-blue-500/10"
              >
                <Download className="w-8 h-8" />
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-white mb-2">
                Import from Your Old Browser
              </motion.h2>

              <motion.p variants={itemVariants} className="text-slate-300 text-sm sm:text-base max-w-md mb-8 leading-relaxed">
                Effortlessly migrate all your bookmarks and saved favorites from Chrome, Brave, or Edge with a single click.
              </motion.p>

              {/* Interactive Transfer Visualizer */}
              <motion.div 
                variants={itemVariants}
                className="w-full max-w-md p-5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl mb-6 flex items-center justify-between shadow-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-800 flex items-center justify-center border border-white/5">
                    <Globe className="w-6 h-6 text-slate-400" />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-white">Chromium Browsers</div>
                    <div className="text-xs text-slate-400">Chrome, Brave, Edge</div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <motion.div 
                    animate={{ x: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="w-2 h-2 rounded-full bg-blue-400"
                  />
                  <motion.div 
                    animate={{ x: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-indigo-400"
                  />
                  <ArrowRight className="w-4 h-4 text-slate-500 ml-1" />
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-blue-400">Nova Browser</div>
                    <div className="text-xs text-slate-400">Target</div>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shadow-lg shadow-blue-500/10">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
              </motion.div>

              {/* Status or Import Action Button */}
              <motion.div variants={itemVariants} className="w-full max-w-md flex flex-col items-center gap-3">
                {importStatus === 'idle' && (
                  <button
                    onClick={handleImport}
                    disabled={isImporting}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {isImporting ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Scanning & Importing Bookmarks...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Import Chrome Bookmarks Now</span>
                      </>
                    )}
                  </button>
                )}

                {importStatus === 'success' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Bookmarks Imported Successfully ({importedData.length} items)!</span>
                  </motion.div>
                )}

                {importStatus === 'error' && (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full py-3.5 px-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-2"
                  >
                    <span>No default Chrome profile detected. You can import manually anytime.</span>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 2: THEME SELECTION */}
          {step === 2 && (
            <motion.div
              key="step-2"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              <motion.div 
                variants={itemVariants}
                className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 shadow-xl shadow-indigo-500/10"
              >
                <Layers className="w-8 h-8" />
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-white mb-2">
                Choose Your Appearance
              </motion.h2>

              <motion.p variants={itemVariants} className="text-slate-300 text-sm sm:text-base max-w-md mb-8">
                Select your preferred visual style. Nova adapts fluidly with hardware-accelerated themes.
              </motion.p>

              {/* Theme Grid with Live Interactive Cards */}
              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4 w-full max-w-lg mb-4">
                {THEMES.map(t => {
                  const isSelected = theme === t.id;
                  return (
                    <motion.button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      whileHover={{ scale: 1.05, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      className={`relative flex flex-col items-center p-4 rounded-2xl border transition-all duration-300 backdrop-blur-xl ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/20 shadow-xl shadow-blue-500/25 ring-2 ring-blue-400/40'
                          : 'border-white/10 bg-slate-900/50 hover:border-white/25 hover:bg-slate-900/80'
                      }`}
                    >
                      {/* Mini Browser Preview Window */}
                      <div className={`w-full aspect-[4/3] rounded-xl overflow-hidden mb-3 shadow-md ${t.previewBg} p-1.5 flex flex-col justify-between`}>
                        <div className={`h-3.5 rounded-md ${t.barBg} flex items-center gap-1 px-1.5`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${t.dotColor}`} />
                          <div className={`w-1.5 h-1.5 rounded-full ${t.dotColor} opacity-70`} />
                          <div className={`w-1.5 h-1.5 rounded-full ${t.dotColor} opacity-40`} />
                        </div>
                        <div className="w-full flex-1 flex items-center justify-center">
                          <div className={`w-8 h-2 rounded bg-gradient-to-r ${t.accentColor} opacity-80`} />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mb-1">
                        {t.icon}
                        <span className="text-sm font-bold text-white">{t.name}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">{t.desc}</span>

                      {isSelected && (
                        <motion.div 
                          layoutId="theme-active-badge"
                          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg border-2 border-slate-950"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 3: SEARCH ENGINE SELECTION */}
          {step === 3 && (
            <motion.div
              key="step-3"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              <motion.div 
                variants={itemVariants}
                className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-4 text-sky-400 shadow-xl shadow-sky-500/10"
              >
                <Search className="w-8 h-8" />
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-white mb-2">
                Default Search Engine
              </motion.h2>

              <motion.p variants={itemVariants} className="text-slate-300 text-sm sm:text-base max-w-md mb-6">
                Choose the search provider for your Omnibox. You can easily switch engines anytime.
              </motion.p>

              {/* Engine Selector List */}
              <motion.div variants={itemVariants} className="flex flex-col gap-2.5 w-full max-w-md mb-2">
                {SEARCH_ENGINES.map(engine => {
                  const isSelected = searchEngine === engine.id;
                  return (
                    <motion.button
                      key={engine.id}
                      onClick={() => setSearchEngine(engine.id)}
                      whileHover={{ scale: 1.02, x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all duration-300 text-left backdrop-blur-xl ${
                        isSelected
                          ? 'border-blue-400 bg-blue-500/20 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/40'
                          : 'border-white/10 bg-slate-900/50 hover:border-white/20 hover:bg-slate-900/80'
                      }`}
                    >
                      <div className="w-9 h-9 flex items-center justify-center shrink-0">
                        {engine.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <span>{engine.name}</span>
                          {engine.id === 'duckduckgo' && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">Privacy</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 truncate">{engine.desc}</div>
                      </div>

                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-blue-400 bg-blue-500 text-white' : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            </motion.div>
          )}

          {/* STEP 4: PRIVACY SHIELD */}
          {step === 4 && (
            <motion.div
              key="step-4"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              <motion.div 
                variants={itemVariants}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-400 shadow-2xl shadow-emerald-500/20"
              >
                <Shield className="w-8 h-8" />
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-3xl font-extrabold text-white mb-2">
                Nova Privacy Shield
              </motion.h2>

              <motion.p variants={itemVariants} className="text-slate-300 text-sm sm:text-base max-w-md mb-6 leading-relaxed">
                High-performance ad & tracker blocking built into the network stack. Keep your browsing private and pages loading 3x faster.
              </motion.p>

              {/* 3 Metric Shields with Live Feedback */}
              <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3 w-full max-w-md mb-6">
                {[
                  { icon: <Ban className="w-6 h-6 text-emerald-400" />, label: 'Ads & Popups' },
                  { icon: <EyeOff className="w-6 h-6 text-cyan-400" />, label: 'Cross-site Trackers' },
                  { icon: <Bug className="w-6 h-6 text-teal-400" />, label: 'Malware & Mining' },
                ].map(item => (
                  <div 
                    key={item.label} 
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col items-center gap-2 transition-all hover:bg-slate-900/90"
                  >
                    <div className="p-2 rounded-xl bg-white/5">
                      {item.icon}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{item.label}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                      privacyShield 
                        ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/30' 
                        : 'text-slate-400 bg-slate-800'
                    }`}>
                      {privacyShield ? 'Blocked' : 'Off'}
                    </span>
                  </div>
                ))}
              </motion.div>

              {/* Interactive Spring Toggle */}
              <motion.div 
                variants={itemVariants}
                className="flex items-center gap-4 p-3 px-6 rounded-2xl bg-slate-900/80 border border-white/10 shadow-lg"
              >
                <button
                  type="button"
                  onClick={() => setPrivacyShield(!privacyShield)}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 cursor-pointer ${
                    privacyShield ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ${
                      privacyShield ? 'translate-x-7.5' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className="text-sm font-semibold text-white">
                  {privacyShield ? 'Privacy Shield Enabled (Recommended)' : 'Shield Disabled'}
                </span>
              </motion.div>
            </motion.div>
          )}

          {/* STEP 5: FINISH & READY */}
          {step === 5 && (
            <motion.div
              key="step-5"
              custom={dir}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Celebratory Checkmark */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="relative mb-6"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-600 rounded-full blur-2xl opacity-60 animate-pulse" />
                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-blue-500/40 border border-white/20">
                  <Check className="w-10 h-10 text-white stroke-[3]" />
                </div>
              </motion.div>

              <motion.h2 variants={itemVariants} className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-2">
                You're All Set!
              </motion.h2>

              <motion.p variants={itemVariants} className="text-slate-300 text-base sm:text-lg max-w-md mb-6 font-normal">
                Nova Browser is completely configured and optimized for maximum speed.
              </motion.p>

              {/* Summary Configuration Recap Cards */}
              <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 mb-8 w-full max-w-md">
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Theme:</span>
                  <strong className="text-white capitalize">{theme}</strong>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Search:</span>
                  <strong className="text-white capitalize">{searchEngine}</strong>
                </div>
                <div className="px-3.5 py-2 rounded-xl bg-slate-900/70 border border-white/10 text-xs text-slate-300 flex items-center gap-2">
                  <span className="text-slate-400">Shield:</span>
                  <strong className={privacyShield ? 'text-emerald-400' : 'text-slate-400'}>
                    {privacyShield ? 'Active' : 'Off'}
                  </strong>
                </div>
              </motion.div>

              {/* Start Browsing Primary CTA */}
              <motion.button
                variants={itemVariants}
                onClick={handleFinish}
                whileHover={{ scale: 1.05, boxShadow: "0 0 35px rgba(99, 102, 241, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                className="group flex items-center gap-3 px-10 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white font-bold text-lg shadow-2xl shadow-indigo-600/30 transition-all border border-white/20"
              >
                <span>Start Browsing</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Bottom Action / Navigation Bar */}
      <div className="relative z-40 w-full px-8 pb-8 pt-2">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          {step > 0 && step < TOTAL_STEPS - 1 ? (
            <motion.button
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              onClick={goBack}
              whileHover={{ scale: 1.03, x: -2 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </motion.button>
          ) : (
            <div />
          )}

          {step > 0 && step < TOTAL_STEPS - 1 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={goNext}
              whileHover={{ scale: 1.04, boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)" }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all"
            >
              <span>{step === TOTAL_STEPS - 2 ? 'Finish Setup' : 'Continue'}</span>
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>
      </div>

    </div>
  );
}
