import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Globe, ArrowRight, ShieldCheck, ShieldAlert, Plus, X, Edit2, Check, CheckSquare, Square, Trash2, ListTodo, VenetianMask, Camera, Shuffle } from 'lucide-react';
import { formatSearchUrl, getSearchEngineName } from '../utils/searchEngine';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { useLiveUnsplashPhoto } from '../utils/unsplash';
import { UserSettings } from '../App';
import { getClientCachedSuggestions, setClientCachedSuggestions } from '../utils/suggestionCache';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

interface NewTabPageProps {
  onNavigate: (url: string) => void;
  searchEngine?: UserSettings['searchEngine'];
  privacyShield?: boolean;
  newTabBackground?: string;
  backgroundCustomUrl?: string;
  showTasksWidget?: boolean;
  isIncognito?: boolean;
  theme?: UserSettings['theme'];
  isActive?: boolean;
  energySaverMode?: boolean;
}

interface ClockProps {
  variants?: any;
  isActive?: boolean;
}

const getInitialTimeAndGreeting = () => {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const hour = now.getHours();
  let greet = 'Good Evening';
  if (hour < 12) greet = 'Good Morning';
  else if (hour < 18) greet = 'Good Afternoon';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  return { time, greet, dateStr };
};

export const Clock: React.FC<ClockProps> = React.memo(({ variants, isActive = true }) => {
  const initial = useMemo(() => getInitialTimeAndGreeting(), []);
  const [timeStr, setTimeStr] = useState(initial.time);
  const [greeting, setGreeting] = useState(initial.greet);
  const [dateStr, setDateStr] = useState(initial.dateStr);

  useEffect(() => {
    if (!isActive) return;
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
      const hour = now.getHours();
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
    };
    updateTime();
    // The UI displays minute precision; polling once per second only caused
    // unnecessary React renders and locale formatting work.
    const now = new Date();
    const delayToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    let interval: ReturnType<typeof setInterval> | undefined;
    const firstTick = setTimeout(() => {
      updateTime();
      interval = setInterval(updateTime, 60_000);
    }, Math.max(250, delayToNextMinute));
    return () => {
      clearTimeout(firstTick);
      if (interval) clearInterval(interval);
    };
  }, [isActive]);

  return (
    <motion.div 
      variants={variants} 
      className="flex flex-col items-center justify-center text-center mb-2 select-none"
    >
      <div className="flex items-center gap-1.5 mb-2 px-3.5 py-1 rounded-full bg-slate-900/10 dark:bg-white/10 backdrop-blur-xl border border-slate-900/10 dark:border-white/15 text-xs font-semibold tracking-wider text-slate-800 dark:text-cyan-300 shadow-sm">
        <span>{dateStr}</span>
      </div>
      <h1 className="text-7xl md:text-8xl font-extralight tracking-tight text-slate-900 dark:text-white font-sans tabular-nums drop-shadow-[0_2px_12px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)]">
        {timeStr}
      </h1>
      <p className="text-xl md:text-2xl text-slate-700 dark:text-slate-200 font-light tracking-wide mt-1 drop-shadow-[0_1px_8px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
        {greeting}
      </p>
    </motion.div>
  );
});

const DEFAULT_SPEED_DIALS = [
  { name: 'Google', url: 'https://www.google.com', domain: 'google.com' },
  { name: 'GitHub', url: 'https://github.com', domain: 'github.com' },
  { name: 'YouTube', url: 'https://www.youtube.com', domain: 'youtube.com' },
  { name: 'Reddit', url: 'https://www.reddit.com', domain: 'reddit.com' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', domain: 'wikipedia.org' }
];

// Session-level flag: only run the entrance animation once on initial application launch
let hasAnimatedInitialLaunch = false;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.04, delayChildren: 0.01 }
  }
};

const itemVariants: any = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
  }
};

export const NewTabPage: React.FC<NewTabPageProps> = React.memo(({ 
  onNavigate,
  searchEngine = 'google',
  privacyShield = true,
  newTabBackground = 'default',
  backgroundCustomUrl = '',
  showTasksWidget = true,
  isIncognito = false,
  theme = 'dark',
  isActive = true,
  energySaverMode = false,
}) => {
  // Only animate on the first app launch, all subsequent new tabs open instantly
  const [shouldAnimate] = useState(() => {
    if (!hasAnimatedInitialLaunch) {
      hasAnimatedInitialLaunch = true;
      return true;
    }
    return false;
  });

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [speedDials, setSpeedDials] = useState(() => {
    // Incognito: never read persistent storage
    if (isIncognito) return DEFAULT_SPEED_DIALS;
    try {
      const saved = localStorage.getItem('nova_speed_dials');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(d => d && typeof d.url === 'string' && isSafeNavigationUrl(d.url));
        }
      }
    } catch (e) {}
    return DEFAULT_SPEED_DIALS;
  });

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDial, setEditingDial] = useState<{name: string, url: string, index: number | null}>({ name: '', url: '', index: null });

  const [todos, setTodos] = useState<Todo[]>(() => {
    // Incognito: never read persistent storage
    if (isIncognito) return [];
    try {
      const saved = localStorage.getItem('nova_todos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e) {}
    return [];
  });
  const [newTodo, setNewTodo] = useState('');

  // Resolved Daily 4K Ultra HD Wallpaper (only loads if wallpaper mode is active)
  const { photo: unsplashPhoto, photoUrl: unsplashUrl, shuffleNext: shuffleWallpaper } = useLiveUnsplashPhoto(newTabBackground === 'unsplash');

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search suggestions
  useEffect(() => {
    const trimmed = (typeof query === 'string' ? query : '').trim();
    if (!isFocused || !trimmed || trimmed.includes('://')) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // 1. Instant 0ms cache lookup
    const cacheKey = `${trimmed}_${searchEngine}`;
    const cached = getClientCachedSuggestions(cacheKey);
    if (cached) {
      setSuggestions(cached.slice(0, 6));
      setShowSuggestions(cached.length > 0);
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timer = setTimeout(async () => {
      try {
        const clientLocale = typeof navigator !== 'undefined' ? navigator.language : 'tr-TR';
        if (typeof window !== 'undefined' && (window as any).electronAPI?.getSuggestions) {
          const results = await (window as any).electronAPI.getSuggestions(trimmed, searchEngine, clientLocale);
          if (!abortController.signal.aborted && Array.isArray(results)) {
            setClientCachedSuggestions(cacheKey, results);
            setSuggestions(results.slice(0, 6));
            setShowSuggestions(results.length > 0);
            return;
          }
        }
        const lang = clientLocale.split('-')[0] || 'tr';
        const country = clientLocale.split('-')[1] || (lang === 'tr' ? 'TR' : 'US');
        const res = await fetch(`https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(trimmed)}&hl=${lang}&gl=${country}`, {
          signal: abortController.signal
        });
        if (!abortController.signal.aborted && res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data) && Array.isArray(data[1])) {
            const list = data[1].slice(0, 6);
            setClientCachedSuggestions(cacheKey, list);
            setSuggestions(list);
            setShowSuggestions(list.length > 0);
          }
        }
      } catch (err) {
        // ignore aborted or network errors
      }
    }, 35);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [query, isFocused, searchEngine]);

  useEffect(() => {
    if (isIncognito) return; // Incognito: never persist
    try {
      localStorage.setItem('nova_todos', JSON.stringify(todos));
    } catch (e) {}
  }, [todos]);

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodo.trim()) return;
    setTodos([...todos, { id: Date.now().toString(), text: newTodo.trim(), completed: false }]);
    setNewTodo('');
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const clearCompletedTodos = () => {
    setTodos(todos.filter(t => !t.completed));
  };

  useEffect(() => {
    if (isIncognito) return; // Incognito: never persist
    try {
      localStorage.setItem('nova_speed_dials', JSON.stringify(speedDials));
    } catch (e) {}
  }, [speedDials]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && selectedIndex >= 0 && selectedIndex < suggestions.length) {
      e.preventDefault();
      setQuery(suggestions[selectedIndex]);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setShowSuggestions(true);
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let target = query.trim();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      target = suggestions[selectedIndex];
    }
    if (!target) return;
    setShowSuggestions(false);
    onNavigate(formatSearchUrl(target, searchEngine));
  };

  const handleAddSpeedDial = () => {
    if (!editingDial.name || !editingDial.url) return;
    let url = editingDial.url.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    if (!isSafeNavigationUrl(url)) return;
    try {
      const parsed = new URL(url);
      const domain = parsed.hostname;
      if (!domain) return;
      if (editingDial.index !== null) {
        const updated = [...speedDials];
        updated[editingDial.index] = { name: editingDial.name, url, domain };
        setSpeedDials(updated);
      } else {
        setSpeedDials([...speedDials, { name: editingDial.name, url, domain }]);
      }
    } catch(e) {
      return;
    }

    setIsEditModalOpen(false);
    setEditingDial({ name: '', url: '', index: null });
  };

  const handleDeleteSpeedDial = (index: number) => {
    setSpeedDials(speedDials.filter((_: any, i: number) => i !== index));
  };


  // Memoize particle arrays to prevent jitter/regeneration on keystrokes
  const starParticles = React.useMemo(() => {
    return Array.from({ length: 36 }, (_, i) => ({
      id: i,
      size: (i % 3 === 0 ? 2.5 : i % 2 === 0 ? 2 : 1.5),
      top: `${(i * 17 + 7) % 96}%`,
      left: `${(i * 23 + 13) % 98}%`,
      duration: 3 + (i % 4) * 1.5,
      delay: (i % 5) * 0.8,
    }));
  }, []);

  const fireflyParticles = React.useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      size: 3 + (i % 3) * 1.5,
      top: `${(i * 19 + 5) % 92}%`,
      left: `${(i * 29 + 11) % 94}%`,
      driftX: ((i % 5) - 2) * 20,
      driftY: -35 - (i % 4) * 15,
      duration: 5 + (i % 4) * 2,
      delay: (i % 6) * 0.7,
    }));
  }, []);

  const matrixColumns = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      id: i,
      left: `${(i / 24) * 100 + 1}%`,
      height: `${30 + (i % 5) * 10}%`,
      speed: 2.2 + (i % 4) * 0.8,
      delay: (i % 7) * 0.4,
      opacity: 0.35 + (i % 3) * 0.25,
    }));
  }, []);

  const isDarkTheme = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark'));

  const getBackgroundStyle = () => {
    if (newTabBackground === 'unsplash' || newTabBackground === 'custom_url') {
      return 'text-white';
    }
    if (!isDarkTheme) {
      return 'bg-white text-slate-900';
    }
    switch (newTabBackground) {
      case 'gradient':
        return 'bg-gradient-to-br from-indigo-900 via-slate-900 to-purple-950 text-white';
      case 'mesh':
      case 'aurora_waves':
      case 'cyber_grid':
      case 'hyper_space':
      case 'fireflies':
      case 'nebula':
      case 'matrix':
        return 'bg-[#0B0F19] text-white';
      case 'glass':
        return 'bg-slate-900/90 text-white backdrop-blur-xl';
      default:
        return 'bg-[#0B0F19] text-white';
    }
  };

  const isVideoBg = newTabBackground === 'custom_url' && backgroundCustomUrl && (backgroundCustomUrl.toLowerCase().endsWith('.mp4') || backgroundCustomUrl.toLowerCase().endsWith('.webm'));

  if (isIncognito) {
    return (
      <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-6 select-none bg-slate-950 text-slate-100">
        <motion.div 
          variants={shouldAnimate ? containerVariants : undefined}
          initial={shouldAnimate ? "hidden" : false}
          animate="visible"
          className="w-full max-w-2xl flex flex-col items-center gap-10 z-10"
        >
          <motion.div variants={shouldAnimate ? itemVariants : undefined} className="flex flex-col items-center text-center">
            <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-8 border border-slate-800 shadow-2xl shadow-black/50">
              <VenetianMask className="w-16 h-16 text-slate-300" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-white mb-4">You are in Incognito Tab</h1>
            <p className="text-lg text-slate-400 max-w-lg">
              Your browsing history, cookies, site data, and information entered in forms will not be saved.
            </p>
          </motion.div>

          <motion.div variants={shouldAnimate ? itemVariants : undefined} className="w-full relative group">
            <form onSubmit={handleSearch} className="w-full">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type URL in incognito mode..."
                className="w-full block pl-14 pr-12 py-4.5 bg-slate-900/50 border border-slate-800 rounded-2xl text-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-700 focus:bg-slate-900 focus:border-slate-700 transition-colors duration-200 shadow-xl backdrop-blur-xl"
              />
              <button 
                type="submit"
                className="absolute inset-y-0 right-2 flex items-center justify-center w-10 my-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={shouldAnimate ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={shouldAnimate ? { duration: 0.2, ease: 'easeOut' } : { duration: 0 }}
      className={`w-full h-full relative overflow-hidden flex flex-col items-center justify-center p-6 select-none ${getBackgroundStyle()} ${isDarkTheme ? 'dark' : ''}`}
    >
      
      {/* Unsplash Background */}
      {newTabBackground === 'unsplash' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div 
            key={unsplashUrl}
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 animate-in fade-in duration-1000"
            style={{ 
              backgroundImage: `url('${unsplashUrl}')` 
            }}
          />
          <div className="absolute inset-0 bg-black/25"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40"></div>
          
          {/* Daily 4K Wallpaper Credit & Shuffle Button */}
          {unsplashPhoto && (
            <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2.5 text-white/90 hover:text-white text-xs bg-black/50 hover:bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-xl transition-all pointer-events-auto group">
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-blue-500/30 text-blue-300 rounded border border-blue-400/30">4K UHD</span>
              <span className="font-medium max-w-[220px] truncate">{unsplashPhoto.title}</span>
              <span className="opacity-40">•</span>
              <span className="opacity-80 max-w-[180px] truncate">{unsplashPhoto.author}</span>
              <button
                type="button"
                onClick={shuffleWallpaper}
                className="ml-1 p-1 hover:bg-white/20 rounded-full transition-colors flex items-center gap-1 text-white/90 hover:text-white"
                title="Shuffle / Next Daily Photo"
              >
                <Shuffle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Custom URL Background */}
      {newTabBackground === 'custom_url' && backgroundCustomUrl && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isVideoBg ? (
            <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              src={backgroundCustomUrl}
            />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-700 scale-105"
              style={{ backgroundImage: `url('${backgroundCustomUrl}')` }}
            />
          )}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/50"></div>
        </div>
      )}

      {/* Default Clean Subtle Glow */}
      {newTabBackground === 'default' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {isDarkTheme ? (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,rgba(30,58,138,0.15),rgba(11,15,25,0))]" />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_30%,rgba(219,234,254,0.6),rgba(255,255,255,0))]" />
          )}
        </div>
      )}

      {/* Vibrant Gradient Background.
          PERF: the drift animation must run on the COMPOSITOR (transform) —
          the previous backgroundPosition keyframes repainted this entire
          oversized blurred layer every frame. The extra full-screen
          backdrop-blur-[50px] overlay was also removed: the element's own
          blur-3xl filter already provides the soft look, and stacking a
          backdrop filter over an animated layer doubles GPU cost per frame. */}
      {newTabBackground === 'gradient' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={isActive ? { 
              x: ['0%', '25%', '0%'],
            } : false}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[50%] blur-3xl opacity-80"
            style={{
              backgroundImage: isDarkTheme
                ? 'linear-gradient(120deg, #1e1b4b, #0f172a, #3b0764, #022c22, #1e1b4b)'
                : 'linear-gradient(120deg, #dbeafe, #fce7f3, #e0e7ff, #ccfbf1, #dbeafe)',
              backgroundSize: '300% 300%',
              willChange: 'transform',
            }}
          />
          <div className={`absolute inset-0 ${isDarkTheme ? 'bg-[#0B0F19]/60' : 'bg-white/50'}`}></div>
        </div>
      )}

      {/* Glass Prism Background */}
      {newTabBackground === 'glass' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className={`absolute inset-0 ${isDarkTheme ? 'bg-[#0a0d16]' : 'bg-slate-100'}`} />
          <div className="absolute -top-[30%] left-[10%] w-[60vw] h-[60vw] rounded-full bg-blue-600/15 blur-[120px]" />
          <div className="absolute -bottom-[30%] right-[10%] w-[60vw] h-[60vw] rounded-full bg-violet-600/15 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:20px_20px]" />
          <div className={`absolute inset-0 backdrop-blur-2xl ${isDarkTheme ? 'bg-black/30' : 'bg-white/30'}`} />
        </div>
      )}

      {/* Fluid Mesh Aurora */}
      {newTabBackground === 'mesh' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div 
            animate={isActive ? { x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] } : false}
            transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[15%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/20 blur-[60px]"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          />
          <motion.div 
            animate={isActive ? { x: [0, -40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] } : false}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute -bottom-[15%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/20 blur-[60px]"
            style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          />
          <motion.div 
            animate={isActive ? { scale: [1, 1.15, 1], opacity: [0.15, 0.28, 0.15] } : false}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            className="absolute top-[25%] right-[20%] w-[35vw] h-[35vw] rounded-full bg-teal-500/15 blur-[50px]"
            style={{ willChange: 'transform, opacity', transform: 'translateZ(0)' }}
          />
        </div>
      )}

      {/* Aurora Waves */}
      {newTabBackground === 'aurora_waves' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#080b12]' : 'bg-slate-50'}`}>
          <motion.div 
            animate={isActive ? { 
              x: ['0%', '-33.33%', '0%'],
            } : false}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className={`absolute top-[-30%] bottom-[-30%] left-0 w-[300%] blur-[48px] ${isDarkTheme ? 'opacity-60' : 'opacity-30'}`}
            style={{
              background: isDarkTheme 
                ? 'linear-gradient(-45deg, #4338ca, #ec4899, #7c3aed, #06b6d4, #4338ca)' 
                : 'linear-gradient(-45deg, #818cf8, #f472b6, #a855f7, #38bdf8, #818cf8)',
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          />
          <div className={`absolute inset-0 ${isDarkTheme ? 'bg-[#080b12]/40' : 'bg-white/30'}`}></div>
        </div>
      )}

      {/* 3D Cyber Neon Grid */}
      {newTabBackground === 'cyber_grid' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#04060a]' : 'bg-slate-900'}`}>
          {/* Horizon Glow Sun */}
          <div className="absolute top-[35%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-gradient-to-b from-cyan-500/20 via-purple-500/15 to-transparent blur-[60px]" />
          
          <div 
            className="absolute inset-0 overflow-hidden"
            style={{
              perspective: '500px',
              perspectiveOrigin: '50% 50%',
            }}
          >
            <motion.div 
              animate={isActive ? { 
                y: ['0px', '48px'],
              } : false}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-0 left-[-50%] right-[-50%] h-[85vh]"
              style={{
                backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.4) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(6, 182, 212, 0.4) 1.5px, transparent 1.5px)',
                backgroundSize: '48px 48px',
                transform: 'rotateX(68deg) scale(2.4) translateZ(0)',
                transformOrigin: '50% 100%',
                willChange: 'transform',
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#04060a]/75 to-[#04060a]"></div>
        </div>
      )}

      {/* Hyper Space (Stable Stars) */}
      {newTabBackground === 'hyper_space' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#05070e]' : 'bg-slate-950'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.25)_0%,rgba(5,7,14,1)_70%)]" />
          {starParticles.map((star) => (
            <motion.div
              key={`star-${star.id}`}
              className="absolute rounded-full bg-white"
              style={{
                width: `${star.size}px`,
                height: `${star.size}px`,
                top: star.top,
                left: star.left,
                boxShadow: '0 0 6px 1px rgba(255,255,255,0.6)',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
              animate={isActive ? {
                scale: [0.7, 1.4, 0.7],
                opacity: [0.2, 0.95, 0.2],
              } : false}
              transition={{
                duration: star.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: star.delay
              }}
            />
          ))}
        </div>
      )}

      {/* Fireflies (Stable Particles) */}
      {newTabBackground === 'fireflies' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#0a0f1d]' : 'bg-slate-900'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(30,64,175,0.25)_0%,rgba(10,15,29,1)_75%)]" />
          {fireflyParticles.map((fly) => (
            <motion.div
              key={`firefly-${fly.id}`}
              className="absolute bg-amber-400 rounded-full"
              style={{
                width: `${fly.size}px`,
                height: `${fly.size}px`,
                top: fly.top,
                left: fly.left,
                boxShadow: '0 0 10px 2px rgba(251, 191, 36, 0.45)',
                willChange: 'transform, opacity',
                transform: 'translateZ(0)'
              }}
              animate={isActive ? {
                y: [0, fly.driftY, 0],
                x: [0, fly.driftX, 0],
                opacity: [0.15, 0.9, 0.35, 0.9, 0.15],
                scale: [0.85, 1.25, 0.85]
              } : false}
              transition={{
                duration: fly.duration,
                repeat: Infinity,
                ease: "easeInOut",
                delay: fly.delay
              }}
            />
          ))}
        </div>
      )}

      {/* Nebula Flow */}
      {newTabBackground === 'nebula' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#07070b]' : 'bg-slate-950'}`}>
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.3)_0%,rgba(7,7,11,1)_70%)]" />
          <motion.div
            animate={isActive ? {
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            } : false}
            transition={{ duration: 45, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[50%] blur-[56px] opacity-50"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, #4338ca, #d946ef, #7c3aed, #06b6d4, #4338ca)',
              willChange: 'transform',
              transform: 'translateZ(0)'
            }}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}

      {/* Digital Rain / Matrix (Stable Streams) */}
      {newTabBackground === 'matrix' && (
        <div className={`absolute inset-0 overflow-hidden pointer-events-none ${isDarkTheme ? 'bg-[#020503]' : 'bg-slate-950'}`}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.2)_0%,rgba(2,5,3,1)_80%)]" />
          {matrixColumns.map((col) => (
            <motion.div
              key={`rain-${col.id}`}
              className="absolute w-[2px] bg-gradient-to-b from-transparent via-emerald-400 to-emerald-200"
              style={{
                left: col.left,
                height: col.height,
                top: '-40%',
                opacity: col.opacity,
                boxShadow: '0 0 8px 1.5px rgba(16, 185, 129, 0.4)',
                willChange: 'transform',
                transform: 'translateZ(0)'
              }}
              animate={isActive ? {
                y: ['0vh', '140vh'],
              } : false}
              transition={{
                duration: col.speed,
                repeat: Infinity,
                ease: "linear",
                delay: col.delay
              }}
            />
          ))}
        </div>
      )}

      {/* Main Content Area */}
      <motion.div 
        variants={shouldAnimate ? containerVariants : undefined}
        initial={shouldAnimate ? "hidden" : false}
        animate="visible"
        className="w-full max-w-2xl flex flex-col items-center gap-8 z-10"
      >
        {/* Clock & Greeting */}
        <Clock variants={shouldAnimate ? itemVariants : undefined} isActive={isActive} />

        {/* Omnibox / Search Form */}
        <motion.div variants={shouldAnimate ? itemVariants : undefined} className="w-full relative z-30" ref={searchContainerRef}>
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none z-10 text-slate-400 group-focus-within:text-cyan-500 transition-colors">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                setIsFocused(true);
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleKeyDown}
              placeholder={`Search with ${getSearchEngineName(searchEngine)} or enter URL...`}
              className="w-full py-4 pl-12 pr-24 text-base rounded-2xl outline-none transition-all duration-300 shadow-2xl border bg-white/85 dark:bg-slate-900/70 backdrop-blur-2xl border-slate-200/80 dark:border-white/15 text-slate-900 dark:text-white placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900/90 focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20"
            />
            
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                    setSelectedIndex(-1);
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="p-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white transition-all shadow-md shadow-cyan-500/30 active:scale-95 font-bold cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute top-full left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 py-1.5 divide-y divide-slate-100 dark:divide-white/5"
              >
                {suggestions.map((s, idx) => (
                  <button
                    key={`${s}-${idx}`}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                      onNavigate(formatSearchUrl(s, searchEngine));
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                      idx === selectedIndex 
                        ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 font-semibold border-l-2 border-cyan-500' 
                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5 font-normal'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Search className={`w-4 h-4 shrink-0 ${idx === selectedIndex ? 'text-cyan-500' : 'text-slate-400'}`} />
                      <span className="truncate">{s}</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Privacy Indicator */}
          <div className="flex items-center justify-between px-3 mt-2 text-xs font-medium text-slate-600 dark:text-slate-300 drop-shadow-sm">
            <div className="flex items-center gap-1.5">
              {privacyShield ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  <span>Shield Active (AdBlock & Tracker Protection)</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  <span>Shield Disabled</span>
                </>
              ) }
            </div>
            <span>Engine: {getSearchEngineName(searchEngine)}</span>
          </div>
        </motion.div>

        {/* Speed Dials */}
        <motion.div variants={shouldAnimate ? itemVariants : undefined} className="w-full">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-5 px-2">
            {speedDials.map((dial: any, idx: number) => (
              <motion.div 
                key={`${dial.name}-${dial.url}-${idx}`} 
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative group w-[100px] sm:w-[110px]"
              >
                <button
                  onClick={() => onNavigate(dial.url)}
                  className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-3 gap-2 transition-all duration-300 border shadow-md bg-white/80 dark:bg-white/[0.07] backdrop-blur-xl border-slate-200/80 dark:border-white/15 hover:bg-white dark:hover:bg-white/[0.14] hover:border-cyan-400/50 hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer group"
                >
                  <div className="w-11 h-11 rounded-xl bg-white dark:bg-slate-800/90 flex items-center justify-center overflow-hidden p-2 shadow-xs shrink-0 border border-slate-100 dark:border-white/10 group-hover:scale-105 transition-transform">
                    <img 
                      src={`https://www.google.com/s2/favicons?domain=${dial.domain || dial.url}&sz=64`}
                      alt={dial.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <span className="text-xs font-semibold truncate max-w-full text-slate-800 dark:text-slate-200 group-hover:text-cyan-500 dark:group-hover:text-cyan-300 transition-colors drop-shadow-2xs">{dial.name}</span>
                </button>
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-slate-900/80 rounded-lg p-0.5 backdrop-blur-xs z-10">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingDial({ name: dial.name, url: dial.url, index: idx });
                      setIsEditModalOpen(true);
                    }}
                    className="p-1 text-slate-300 hover:text-white rounded cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpeedDial(idx);
                    }}
                    className="p-1 text-red-400 hover:text-red-300 rounded cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}

            {speedDials.length < 10 && (
              <motion.div 
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.96 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="relative group w-[100px] sm:w-[110px]"
              >
                <button
                  onClick={() => {
                    setEditingDial({ name: '', url: '', index: null });
                    setIsEditModalOpen(true);
                  }}
                  className="w-full aspect-square rounded-2xl flex flex-col items-center justify-center p-3 gap-2 transition-all duration-300 border-2 border-dashed border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/[0.04] backdrop-blur-xl hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-500/10 dark:hover:bg-cyan-500/10 text-slate-500 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-300 cursor-pointer shadow-xs"
                >
                  <Plus className="w-6 h-6" />
                  <span className="text-xs font-semibold">Add</span>
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ToDo / Tasks Widget */}
      {showTasksWidget && (
      <motion.div 
        initial={shouldAnimate ? { opacity: 0, y: 15 } : false}
        animate={{ opacity: 1, y: 0 }}
        transition={shouldAnimate ? { duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.1 } : { duration: 0 }}
        className="nova-tasks-widget absolute bottom-6 right-6 w-72 rounded-3xl overflow-hidden flex flex-col shadow-2xl border bg-white/85 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/90 dark:border-slate-700/60 dark:shadow-black/40"
        style={{ maxHeight: '380px' }}
      >
        <div className="px-5 py-3.5 border-b font-semibold text-sm flex justify-between items-center border-slate-200/80 dark:border-slate-700/50 text-slate-800 dark:text-white">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-accent" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium opacity-60 bg-slate-500/10 px-2 py-0.5 rounded-full">
              {todos.filter(t => !t.completed).length} left
            </span>
            {todos.some(t => t.completed) && (
              <button
                onClick={clearCompletedTodos}
                className="text-xs font-semibold text-red-500 hover:text-red-400 transition-colors opacity-80 hover:opacity-100 ml-1 cursor-pointer"
                title="Clear completed tasks"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2.5 space-y-1 scrollbar-hide">
          <AnimatePresence initial={false}>
            {todos.map(todo => (
              <motion.div 
                key={todo.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                onClick={() => toggleTodo(todo.id)}
                className={`flex items-center justify-between gap-3 p-2.5 rounded-xl group cursor-pointer transition-colors ${
                  todo.completed ? 'opacity-60 bg-slate-500/5' : 'hover:bg-slate-100/80 dark:hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-colors ${
                    todo.completed 
                      ? 'bg-accent text-white shadow-xs shadow-accent/30' 
                      : 'border-2 border-slate-300 dark:border-slate-600 group-hover:border-accent'
                  }`}>
                    {todo.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                  <span className={`text-sm truncate select-none transition-colors text-slate-800 dark:text-slate-100 ${
                    todo.completed ? 'line-through opacity-70' : ''
                  }`}>
                    {todo.text}
                  </span>
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTodo(todo.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors shrink-0 cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {todos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-xs opacity-50 space-y-1">
              <CheckSquare className="w-6 h-6 stroke-[1.5] text-accent" />
              <span>No tasks for today. All done!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleAddTodo} className="p-3 border-t border-slate-200/80 dark:border-slate-700/50">
          <div className="relative flex items-center">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="Add a new task..."
              className="w-full bg-slate-500/10 px-3 py-2 pr-8 rounded-xl text-sm outline-none placeholder-opacity-50 transition-colors focus:ring-2 focus:ring-accent/40 text-slate-800 dark:text-white placeholder-slate-500 dark:placeholder-slate-400"
            />
            {newTodo.trim() && (
              <button 
                type="submit" 
                className="absolute right-2 p-1 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </form>
      </motion.div>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
      {isEditModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700"
          >
            <h3 className="text-lg font-bold mb-4">{editingDial.index !== null ? 'Edit Shortcut' : 'Add Shortcut'}</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold opacity-70 block mb-1">Name</label>
                <input 
                  type="text" 
                  value={editingDial.name}
                  onChange={(e) => setEditingDial({ ...editingDial, name: e.target.value })}
                  placeholder="e.g. YouTube"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold opacity-70 block mb-1">URL</label>
                <input 
                  type="text" 
                  value={editingDial.url}
                  onChange={(e) => setEditingDial({ ...editingDial, url: e.target.value })}
                  placeholder="e.g. https://youtube.com"
                  className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl text-sm outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddSpeedDial}
                className="px-4 py-2 bg-accent-hover hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-indigo-600/20"
              >
                Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </motion.div>
  );
});
