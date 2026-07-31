import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Monitor, Search, Shield, Ban, EyeOff, Bug } from 'lucide-react';

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
    desc: 'En popüler, kapsamlı sonuçlar',
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
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
    desc: 'Sizi takip etmez, gizliliğinizi korur',
    icon: (
      <div className="w-8 h-8 rounded-full bg-[#DE5833] flex items-center justify-center">
        <Shield className="w-5 h-5 text-white" />
      </div>
    ),
  },
  {
    id: 'brave' as const,
    name: 'Brave Search',
    desc: 'Bağımsız, reklamsız, hızlı',
    icon: (
      <div className="w-8 h-8 rounded-full bg-[#FB542B] flex items-center justify-center">
        <Search className="w-5 h-5 text-white" />
      </div>
    ),
  },
  {
    id: 'bing' as const,
    name: 'Bing',
    desc: 'Microsoft yapay zekası ile güçlendirilmiş',
    icon: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
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
    desc: 'Her aramada ağaç dikiyor',
    icon: (
      <div className="w-8 h-8 rounded-full bg-[#00894A] flex items-center justify-center">
        <Search className="w-5 h-5 text-white" />
      </div>
    ),
  },
];

const THEMES = [
  {
    id: 'light' as const,
    name: 'Açık',
    icon: <Sun className="w-4 h-4 inline-block -mt-0.5" />,
    preview: 'bg-white border-2 border-slate-200',
    dot: 'bg-slate-800',
    bar: 'bg-slate-100 border-b border-slate-200',
  },
  {
    id: 'dark' as const,
    name: 'Koyu',
    icon: <Moon className="w-4 h-4 inline-block -mt-0.5" />,
    preview: 'bg-slate-900 border-2 border-slate-700',
    dot: 'bg-white',
    bar: 'bg-slate-800 border-b border-slate-700',
  },
  {
    id: 'system' as const,
    name: 'Sistem',
    icon: <Monitor className="w-4 h-4 inline-block -mt-0.5" />,
    preview: 'bg-gradient-to-br from-white to-slate-900 border-2 border-slate-400',
    dot: 'bg-slate-500',
    bar: 'bg-gradient-to-r from-slate-100 to-slate-800',
  },
];

const TOTAL_STEPS = 6;

const slideVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
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

  const steps = [
    // Step 0 — Welcome
    <motion.div key="welcome" className="flex flex-col items-center justify-center h-full text-center px-8">
      {/* Draggable Top Area */}
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
        className="mb-8 mt-10"
      >
        <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-2xl shadow-blue-500/40 flex items-center justify-center mb-6 mx-auto">
          <img src="/nova-icon.jpg" alt="Nova" className="w-20 h-20 rounded-2xl object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      </motion.div>
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-bold text-white mb-4 tracking-tight"
      >
        Nova Browser'a<br />
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Hoş Geldiniz</span>
      </motion.h1>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-slate-300 text-xl max-w-md leading-relaxed mb-12"
      >
        Daha hızlı, daha gizli ve daha akıllı bir web deneyimi sizi bekliyor. Birlikte ayarlayalım.
      </motion.p>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={goNext}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 transition-all"
      >
        Hadi Başlayalım →
      </motion.button>
    </motion.div>,

    // Step 1 — Import Data
    <motion.div key="import" className="flex flex-col items-center justify-center h-full text-center px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-6 shadow-2xl mt-10">
        <svg className="w-10 h-10 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      </div>
      <h2 className="text-4xl font-bold text-white mb-3">Eski Tarayıcınızdan Aktarın</h2>
      <p className="text-slate-400 text-lg max-w-md mb-8">
        Google Chrome (ve Chromium tabanlı diğer tarayıcılardaki) yer işaretlerinizi tek tıkla Nova'ya aktarabilirsiniz.
      </p>
      
      {importStatus === 'idle' && (
        <button
          onClick={handleImport}
          disabled={isImporting}
          className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-medium transition-colors mb-4 flex items-center gap-2"
        >
          {isImporting ? (
            <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          )}
          {isImporting ? 'Aktarılıyor...' : 'Chrome Yer İşaretlerini Aktar'}
        </button>
      )}

      {importStatus === 'success' && (
        <div className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-xl font-medium mb-4 flex items-center gap-2 border border-emerald-500/30">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          Yer işaretleri başarıyla aktarıldı!
        </div>
      )}

      {importStatus === 'error' && (
        <div className="bg-red-500/20 text-red-400 px-6 py-3 rounded-xl font-medium mb-4 flex items-center gap-2 border border-red-500/30 text-sm">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          Chrome verisi bulunamadı veya okunamadı.
        </div>
      )}

      <button onClick={goNext} className="text-slate-400 hover:text-white transition-colors underline decoration-slate-600 underline-offset-4">
        {importStatus === 'success' ? 'Devam Et' : 'Şimdilik Atla'}
      </button>
    </motion.div>,

    // Step 2 — Theme
    <motion.div key="theme" className="flex flex-col items-center justify-center h-full text-center px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <h2 className="text-4xl font-bold text-white mb-3 mt-10">Tema Seçin</h2>
      <p className="text-slate-400 text-lg mb-10">Nova Browser'ın görünümünü kişiselleştirin.</p>
      <div className="flex gap-5 mb-12 flex-wrap justify-center">
        {THEMES.map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all w-40 ${
              theme === t.id
                ? 'border-blue-500 bg-blue-500/10 scale-105 shadow-xl shadow-blue-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
            }`}
          >
            {/* Mini browser preview */}
            <div className={`w-28 h-20 rounded-xl overflow-hidden ${t.preview} shadow-lg`}>
              <div className={`h-5 ${t.bar} flex items-center gap-1 px-2`}>
                <div className={`w-2 h-2 rounded-full ${t.dot} opacity-60`}></div>
                <div className={`w-2 h-2 rounded-full ${t.dot} opacity-40`}></div>
                <div className={`w-2 h-2 rounded-full ${t.dot} opacity-20`}></div>
              </div>
            </div>
            <span className="text-white font-semibold text-sm">{t.icon} {t.name}</span>
            {theme === t.id && (
              <span className="text-blue-400 text-xs font-medium">✓ Seçildi</span>
            )}
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 3 — Search Engine
    <motion.div key="search" className="flex flex-col items-center justify-center h-full text-center px-8 w-full max-w-2xl mx-auto relative">
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <h2 className="text-4xl font-bold text-white mb-3 mt-10">Arama Motorunuz</h2>
      <p className="text-slate-400 text-lg mb-8">Varsayılan arama motorunu seçin. Daha sonra ayarlardan değiştirebilirsiniz.</p>
      <div className="flex flex-col gap-3 w-full mb-8">
        {SEARCH_ENGINES.map(engine => (
          <button
            key={engine.id}
            onClick={() => setSearchEngine(engine.id)}
            className={`flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
              searchEngine === engine.id
                ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/8'
            }`}
          >
            <div className="w-10 h-10 flex items-center justify-center shrink-0">
              {engine.icon}
            </div>
            <div className="flex-1 text-left">
              <div className="text-white font-semibold">{engine.name}</div>
              <div className="text-slate-400 text-sm">{engine.desc}</div>
            </div>
            {searchEngine === engine.id && (
              <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        ))}
      </div>
    </motion.div>,

    // Step 4 — Privacy Shield
    <motion.div key="privacy" className="flex flex-col items-center justify-center h-full text-center px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center mb-6 shadow-2xl shadow-emerald-500/30 mt-10">
        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
      </div>
      <h2 className="text-4xl font-bold text-white mb-3">Gizlilik Kalkanı</h2>
      <p className="text-slate-400 text-lg max-w-md mb-10 leading-relaxed">
        Nova Browser'ın yerleşik gizlilik kalkanı; reklamları, izleyicileri ve kötü amaçlı içerikleri otomatik olarak engeller.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 max-w-lg w-full">
        {[
          { icon: <Ban className="w-8 h-8 text-slate-400" />, label: 'Reklamlar' },
          { icon: <EyeOff className="w-8 h-8 text-slate-400" />, label: 'İzleyiciler' },
          { icon: <Bug className="w-8 h-8 text-slate-400" />, label: 'Kötü Yazılım' },
        ].map(item => (
          <div key={item.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col items-center gap-3 transition-colors hover:bg-white/10">
            {item.icon}
            <span className="text-slate-300 text-sm font-medium">{item.label}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${privacyShield ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
              {privacyShield ? 'Engellendi' : 'Açık'}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setPrivacyShield(!privacyShield)}
          className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${privacyShield ? 'bg-emerald-500' : 'bg-slate-600'}`}
        >
          <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform duration-300 ${privacyShield ? 'translate-x-9' : 'translate-x-1'}`} />
        </button>
        <span className="text-white font-medium text-lg">
          {privacyShield ? 'Gizlilik Kalkanı Aktif' : 'Gizlilik Kalkanı Kapalı'}
        </span>
      </div>
    </motion.div>,

    // Step 5 — Done
    <motion.div key="done" className="flex flex-col items-center justify-center h-full text-center px-8 relative">
      <div className="absolute top-0 left-0 right-0 h-10" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties} />
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/40"
      >
        <svg className="w-14 h-14 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </motion.div>
      <motion.h2
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-5xl font-bold text-white mb-4"
      >
        Hazırsınız! 🎉
      </motion.h2>
      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="text-slate-300 text-xl max-w-md leading-relaxed mb-4"
      >
        Nova Browser hazır. Tüm ayarlarınız kaydedildi ve istediğiniz zaman değiştirebilirsiniz.
      </motion.p>
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="flex gap-6 mb-12 text-sm text-slate-400"
      >
        <span>Tema: <strong className="text-white capitalize">{theme}</strong></span>
        <span>·</span>
        <span>Arama: <strong className="text-white capitalize">{searchEngine}</strong></span>
        <span>·</span>
        <span>Kalkan: <strong className={privacyShield ? 'text-emerald-400' : 'text-red-400'}>{privacyShield ? 'Açık' : 'Kapalı'}</strong></span>
      </motion.div>
      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.7 }}
        onClick={handleFinish}
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.97 }}
        className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-xl shadow-blue-500/30 transition-all"
      >
        Gezintiye Başla 🚀
      </motion.button>
    </motion.div>,
  ];

  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col overflow-hidden">
      {/* Ambient glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* Progress Bar */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div className="w-full h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-violet-500"
            initial={{ width: 0 }}
            animate={{ width: `${(step / (TOTAL_STEPS - 1)) * 100}%` }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          />
        </div>
      )}

      {/* Step dots */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div className="flex justify-center gap-2 pt-6">
          {Array.from({ length: TOTAL_STEPS - 2 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i + 1 === step ? 'w-6 h-2 bg-blue-500' : i + 1 < step ? 'w-2 h-2 bg-blue-500/60' : 'w-2 h-2 bg-white/20'
              }`}
            />
          ))}
        </div>
      )}

      {/* Step Content */}
      <div className="flex-1 relative overflow-hidden flex items-center justify-center">
        <AnimatePresence custom={dir} mode="wait">
          <motion.div
            key={step}
            custom={dir}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute inset-0 flex items-center justify-center"
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      {step > 0 && step < TOTAL_STEPS - 1 && (
        <div className="flex justify-between items-center px-12 pb-10 pt-4">
          <button
            onClick={goBack}
            className="text-slate-400 hover:text-white transition-colors font-medium flex items-center gap-2"
          >
            ← Geri
          </button>
          <button
            onClick={goNext}
            className="bg-gradient-to-r from-blue-500 to-violet-600 hover:from-blue-400 hover:to-violet-500 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
          >
            {step === TOTAL_STEPS - 2 ? 'Tamamla ✓' : 'İleri →'}
          </button>
        </div>
      )}
    </div>
  );
}
