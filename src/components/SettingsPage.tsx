import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Search, ShieldCheck, Download, Upload, Monitor, Bot, Paintbrush, LayoutPanelLeft, Cpu, Play, Square, Copy, Check, Users, Zap, ExternalLink, Key, RefreshCw, Lock, Unlock, ShieldAlert, Keyboard, Puzzle, Loader2, X, Shuffle, Sparkles, Cloud, User, Mail, FolderTree, Link2, Laptop, QrCode, ChevronDown, ChevronUp, Bookmark, Power } from 'lucide-react';
import { UserSettings } from '../App';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import { useLiveUnsplashPhoto, resolveUnsplashPhoto, getUnsplashThumbnailUrl } from '../utils/unsplash';
import { syncService, SyncStatus, SyncPreferences } from '../services/syncService';

const PasswordList = () => {
  const [passwords, setPasswords] = useState<any[]>([]);
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchPasswords = async () => {
      try {
        const raw = await (window as any).electronAPI?.secureStoreGet?.('passwords');
        if (raw) setPasswords(JSON.parse(raw));
      } catch (e) {}
    };
    fetchPasswords();
  }, []);

  const handleDelete = async (index: number) => {
    if (!window.confirm('Are you sure you want to delete this password?')) return;
    const newPasses = [...passwords];
    newPasses.splice(index, 1);
    setPasswords(newPasses);
    try {
      await (window as any).electronAPI?.secureStoreSet?.('passwords', JSON.stringify(newPasses));
    } catch (e) {}
  };

  const toggleVisibility = (index: number) => {
    const next = new Set(visibleIndexes);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setVisibleIndexes(next);
  };

  if (passwords.length === 0) {
    return <div className="p-6 text-center text-slate-500">No saved passwords yet.</div>;
  }

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
      {passwords.map((p, i) => (
        <div key={`${p.hostname}-${p.username}-${i}`} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center flex-shrink-0">
              <img src={`https://www.google.com/s2/favicons?domain=${p.hostname}&sz=32`} className="w-5 h-5" alt="" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-slate-800 dark:text-slate-200">{p.hostname}</div>
              <div className="text-sm text-slate-500 dark:text-slate-400">{p.username}</div>
            </div>
            <div className="flex-1 max-w-[200px] flex items-center gap-2">
              <input 
                type={visibleIndexes.has(i) ? "text" : "password"} 
                value={p.password}
                readOnly
                className="w-full bg-transparent border-none text-sm text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <button onClick={() => toggleVisibility(i)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md">
                {visibleIndexes.has(i) ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <button onClick={() => handleDelete(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg ml-4">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

const DailyWallpaperSection = () => {
  const { photo: currentPhoto, isLoading, shuffleNext } = useLiveUnsplashPhoto();

  return (
    <div className="mt-6 p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Daily 4K Wallpaper (Ultra HD)
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
              3840 × 2160 UHD
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatically updates every day with curated high-resolution photography.
          </p>
        </div>

        <button
          type="button"
          onClick={shuffleNext}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm"
        >
          <Shuffle className="w-3.5 h-3.5" />
          <span>Shuffle / Next Photo</span>
        </button>
      </div>

      {currentPhoto && (
        <div className="mt-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative group shadow-lg">
            <img 
              src={currentPhoto.imageUrl} 
              alt={currentPhoto.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-3.5">
              <div className="text-white flex items-center justify-between w-full">
                <div className="max-w-[75%]">
                  <p className="text-xs font-bold truncate">{currentPhoto.title}</p>
                  <p className="text-[10px] text-white/70 truncate">{currentPhoto.author} • {currentPhoto.source}</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Active 4K
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BACKGROUND_OPTIONS = [
  { id: 'aurora_waves', name: 'Aurora Waves', badge: '3D Wave' },
  { id: 'cyber_grid', name: 'Cyber Grid 3D', badge: '3D Neon' },
  { id: 'hyper_space', name: 'Hyper Space Stars', badge: 'Particles' },
  { id: 'fireflies', name: 'Bioluminescent Fireflies', badge: 'Ambient' },
  { id: 'nebula', name: 'Cosmic Nebula Flow', badge: 'Galaxy' },
  { id: 'matrix', name: 'Digital Matrix Rain', badge: 'Code Rain' },
  { id: 'gradient', name: 'Dynamic Gradient', badge: 'Fluid' },
  { id: 'mesh', name: 'Mesh Aurora', badge: 'Mesh Glow' },
  { id: 'glass', name: 'Dark Glass & Prism', badge: 'Prism Glass' },
  { id: 'default', name: 'Clean Minimalist', badge: 'OLED Glow' },
  { id: 'unsplash', name: 'Daily 4K Wallpaper (Ultra HD)', badge: 'Ultra HD' },
  { id: 'custom_url', name: 'Video / Image URL', badge: 'Custom' },
];

const renderBackgroundAnimation = (id: string, isHovered: boolean, isSelected: boolean) => {
  const active = isHovered || isSelected;

  switch (id) {
    case 'aurora_waves':
      return (
        <div className="absolute inset-0 bg-[#080b12] overflow-hidden">
          <motion.div
            animate={active ? { x: ['0%', '-50%', '0%'] } : { x: '0%' }}
            transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
            className="absolute top-[-50%] bottom-[-50%] left-0 w-[300%] blur-xl opacity-85"
            style={{
              background: 'linear-gradient(-45deg, #4338ca, #ec4899, #7c3aed, #06b6d4, #4338ca)',
              willChange: 'transform'
            }}
          />
          <div className="absolute inset-0 backdrop-blur-md bg-black/25" />
        </div>
      );

    case 'cyber_grid':
      return (
        <div className="absolute inset-0 bg-[#04060a] overflow-hidden">
          <div className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-gradient-to-b from-cyan-500/40 via-purple-500/20 to-transparent blur-md" />
          <div className="absolute inset-0" style={{ perspective: '160px', perspectiveOrigin: '50% 50%' }}>
            <motion.div
              animate={active ? { backgroundPositionY: ['0px', '24px'] } : {}}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-0 left-[-50%] right-[-50%] h-[65%]"
              style={{
                backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.55) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                transform: 'rotateX(65deg) scale(1.8)',
                transformOrigin: '50% 100%',
                willChange: 'background-position'
              }}
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-[#04060a]/60 to-[#04060a]" />
        </div>
      );

    case 'hyper_space':
      return (
        <div className="absolute inset-0 bg-[#05070e] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,58,138,0.35)_0%,rgba(5,7,14,1)_75%)]" />
          {[
            { top: '22%', left: '18%', size: 2, delay: 0 },
            { top: '35%', left: '72%', size: 2.5, delay: 0.3 },
            { top: '65%', left: '28%', size: 2, delay: 0.6 },
            { top: '55%', left: '80%', size: 2.5, delay: 0.2 },
            { top: '18%', left: '48%', size: 1.5, delay: 0.8 },
            { top: '78%', left: '60%', size: 3, delay: 0.4 },
            { top: '42%', left: '40%', size: 2, delay: 0.1 },
            { top: '80%', left: '15%', size: 1.5, delay: 0.7 },
          ].map((star, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: star.size,
                height: star.size,
                top: star.top,
                left: star.left,
                boxShadow: '0 0 6px 1.5px rgba(255,255,255,0.9)'
              }}
              animate={active ? { scale: [0.7, 1.8, 0.7], opacity: [0.3, 1, 0.3] } : { scale: 1, opacity: 0.7 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: star.delay, ease: 'easeInOut' }}
            />
          ))}
        </div>
      );

    case 'fireflies':
      return (
        <div className="absolute inset-0 bg-[#0a0f1d] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(30,64,175,0.3)_0%,rgba(10,15,29,1)_80%)]" />
          {[
            { top: '28%', left: '22%', dx: 14, dy: -10, delay: 0 },
            { top: '60%', left: '68%', dx: -16, dy: -12, delay: 0.4 },
            { top: '38%', left: '52%', dx: 10, dy: 8, delay: 0.8 },
            { top: '72%', left: '32%', dx: -12, dy: -10, delay: 0.2 },
            { top: '24%', left: '78%', dx: -14, dy: 10, delay: 0.6 },
            { top: '50%', left: '12%', dx: 8, dy: -8, delay: 0.5 },
          ].map((fly, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-amber-400"
              style={{
                top: fly.top,
                left: fly.left,
                boxShadow: '0 0 10px 2.5px rgba(251, 191, 36, 0.9)'
              }}
              animate={active ? {
                x: [0, fly.dx, 0],
                y: [0, fly.dy, 0],
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.4, 0.8]
              } : { opacity: 0.6 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: fly.delay, ease: 'easeInOut' }}
            />
          ))}
        </div>
      );

    case 'nebula':
      return (
        <div className="absolute inset-0 bg-[#07070b] overflow-hidden">
          <div className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.4)_0%,rgba(7,7,11,1)_70%)]" />
          <motion.div
            animate={active ? { rotate: [0, 360], scale: [1, 1.15, 1] } : { rotate: 0 }}
            transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[60%] blur-2xl opacity-65"
            style={{
              background: 'conic-gradient(from 0deg at 50% 50%, #4338ca, #d946ef, #7c3aed, #06b6d4, #4338ca)',
              willChange: 'transform'
            }}
          />
          <div className="absolute inset-0 backdrop-blur-xl bg-black/40" />
        </div>
      );

    case 'matrix':
      return (
        <div className="absolute inset-0 bg-[#020503] overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,78,59,0.35)_0%,rgba(2,5,3,1)_80%)]" />
          {[
            { left: '12%', height: '35px', speed: 1.1, delay: 0 },
            { left: '26%', height: '50px', speed: 0.85, delay: 0.3 },
            { left: '40%', height: '30px', speed: 1.3, delay: 0.1 },
            { left: '54%', height: '55px', speed: 1.0, delay: 0.5 },
            { left: '68%', height: '40px', speed: 0.75, delay: 0.2 },
            { left: '82%', height: '48px', speed: 1.2, delay: 0.4 },
            { left: '94%', height: '32px', speed: 0.95, delay: 0.6 },
          ].map((stream, i) => (
            <motion.div
              key={i}
              className="absolute w-[2px] bg-gradient-to-b from-transparent via-emerald-400 to-emerald-200"
              style={{
                left: stream.left,
                height: stream.height,
                top: '-30%',
                boxShadow: '0 0 8px 1.5px rgba(16, 185, 129, 0.7)'
              }}
              animate={active ? { y: ['0px', '180px'] } : {}}
              transition={{ duration: stream.speed, repeat: Infinity, delay: stream.delay, ease: 'linear' }}
            />
          ))}
        </div>
      );

    case 'gradient':
      return (
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <motion.div
            animate={active ? { backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] } : {}}
            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-[30%] blur-xl opacity-90"
            style={{
              backgroundImage: 'linear-gradient(120deg, #1e1b4b, #4338ca, #ec4899, #022c22, #1e1b4b)',
              backgroundSize: '250% 250%',
              willChange: 'background-position'
            }}
          />
          <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
        </div>
      );

    case 'mesh':
      return (
        <div className="absolute inset-0 overflow-hidden bg-slate-950">
          <motion.div
            animate={active ? { x: [0, 20, 0], y: [0, -15, 0] } : {}}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-6 -left-6 w-28 h-28 rounded-full bg-purple-600/50 blur-xl"
          />
          <motion.div
            animate={active ? { x: [0, -25, 0], y: [0, 20, 0] } : {}}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute -bottom-6 -right-6 w-28 h-28 rounded-full bg-blue-600/50 blur-xl"
          />
          <motion.div
            animate={active ? { scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] } : {}}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-1/4 right-1/4 w-20 h-20 rounded-full bg-teal-500/40 blur-lg"
          />
        </div>
      );

    case 'glass':
      return (
        <div className="absolute inset-0 bg-[#0a0d16] overflow-hidden">
          <div className="absolute -top-10 left-4 w-28 h-28 rounded-full bg-blue-600/25 blur-2xl" />
          <div className="absolute -bottom-10 right-4 w-28 h-28 rounded-full bg-violet-600/25 blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0f_1px,transparent_1px)] [background-size:12px_12px]" />
          <motion.div
            animate={active ? { x: ['-100%', '250%'] } : { x: '-100%' }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 0.8 }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
          <div className="absolute inset-0 backdrop-blur-md bg-black/20" />
        </div>
      );

    case 'unsplash':
      return (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      );

    case 'custom_url':
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
          <motion.div
            animate={active ? { scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] } : { scale: 1, opacity: 0.5 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/20"
          >
            <Play size={18} className="ml-0.5" />
          </motion.div>
        </div>
      );

    case 'default':
    default:
      return (
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-[#0B0F19] to-slate-950 overflow-hidden">
          <motion.div
            animate={active ? { scale: [1, 1.25, 1], opacity: [0.25, 0.65, 0.25] } : { opacity: 0.3 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_40%,rgba(59,130,246,0.25),transparent)]"
          />
        </div>
      );
  }
};

const BackgroundPreviewCard: React.FC<{
  bg: { id: string; name: string; badge?: string };
  isSelected: boolean;
  onSelect: () => void;
}> = ({ bg, isSelected, onSelect }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative h-36 rounded-2xl overflow-hidden border-2 text-left transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-cyan-500 ring-2 ring-cyan-500/30 shadow-xl shadow-cyan-500/15 scale-[1.02] z-10'
          : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400/60 dark:hover:border-cyan-500/40 hover:shadow-lg'
      }`}
    >
      {/* Background Live Preview Layer */}
      {renderBackgroundAnimation(bg.id, isHovered, isSelected)}

      {/* Overlay & Content */}
      <div className="absolute inset-0 flex flex-col justify-between p-3 z-20 pointer-events-none">
        {/* Selection Checkmark */}
        <div className="flex justify-end w-full">
          {isSelected && (
            <div className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md font-bold">
              <Check size={12} strokeWidth={3} />
            </div>
          )}
        </div>

        {/* Bottom Title */}
        <div className="bg-gradient-to-t from-black/90 via-black/50 to-transparent -mx-3 -mb-3 p-3 pt-5 rounded-b-2xl">
          <p className="text-white font-medium text-sm drop-shadow-sm truncate">
            {bg.name}
          </p>
        </div>
      </div>
    </button>
  );
};

export interface SettingsPageProps {
  url?: string;
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
  onExportData?: () => void;
  onImportData?: (file: File) => void;
  onClearHistory?: () => void;
  onPurgeMemory?: () => Promise<void> | void;
}

interface UpdateInfo {
  version: string;
  releaseDate: string;
}

const UpdateWidget = () => {
  const [status, setStatus] = React.useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'up-to-date' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = React.useState('');
  const [progress, setProgress] = React.useState(0);
  const [updateVersion, setUpdateVersion] = React.useState('');

  React.useEffect(() => {
    let unsubs: (() => void)[] = [];
    const api = (window as any).electronAPI;
    if (api) {
      if (api.onUpdateChecking) unsubs.push(api.onUpdateChecking(() => setStatus('checking')));
      if (api.onUpdateAvailable) unsubs.push(api.onUpdateAvailable((_: any, info: any) => {
        setStatus('available');
        setUpdateVersion(info?.version || '');
      }));
      if (api.onUpdateNotAvailable) unsubs.push(api.onUpdateNotAvailable((_: any, info: any) => {
        setStatus('up-to-date');
        setUpdateVersion(info?.version || '');
      }));
      if (api.onUpdateDownloadProgress) unsubs.push(api.onUpdateDownloadProgress((_: any, p: any) => {
        setStatus('downloading');
        setProgress(Math.round(p?.percent || 0));
      }));
      if (api.onUpdateDownloaded) unsubs.push(api.onUpdateDownloaded((_: any, info: any) => {
        setStatus('downloaded');
        setUpdateVersion(info?.version || '');
      }));
      if (api.onUpdateError) unsubs.push(api.onUpdateError((_: any, err: string) => {
        setStatus('error');
        setErrorMsg(typeof err === 'string' ? err : 'Unknown error');
      }));
    }
    return () => unsubs.forEach(u => u());
  }, []);

  const check = async () => {
    setStatus('checking');
    setErrorMsg('');
    const api = (window as any).electronAPI;
    if (api?.checkForUpdates) {
      try {
        await api.checkForUpdates();
      } catch {
        setStatus('error');
        setErrorMsg('Could not check for updates');
      }
    } else {
      setStatus('error');
      setErrorMsg('Update API not available');
    }
  };

  const install = () => {
    const api = (window as any).electronAPI;
    if (api?.installUpdate) {
      api.installUpdate();
    }
  };

  if (status === 'downloaded') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
          v{updateVersion || 'new'} ready to install!
        </span>
        <button onClick={install} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors text-sm shadow-sm flex items-center gap-2">
          <Download className="w-4 h-4" /> Restart & Install
        </button>
      </div>
    );
  }

  if (status === 'downloading') {
    return (
      <div className="flex items-center gap-3 w-full max-w-xs">
        <div className="flex-1">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-blue-600 dark:text-blue-400 font-medium">Downloading{updateVersion ? ` v${updateVersion}` : ''}...</span>
            <span className="text-slate-500">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (status === 'available') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Update v{updateVersion || '?'} found, downloading...</span>
        <div className="w-4 h-4 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (status === 'up-to-date') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Up to date (v{updateVersion || '?'})
        </span>
        <button onClick={check} className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          Check again
        </button>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-red-500">Failed: {errorMsg.substring(0, 50)}{errorMsg.length > 50 ? '...' : ''}</span>
        <button onClick={check} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl font-medium transition-colors text-sm">
          Try Again
        </button>
      </div>
    );
  }

  return (
    <button onClick={check} disabled={status === 'checking'} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-xl font-medium transition-colors text-sm flex items-center gap-2 disabled:opacity-50">
      {status === 'checking' ? <div className="w-4 h-4 rounded-full border-2 border-blue-600 dark:border-blue-400 border-t-transparent animate-spin" /> : <RefreshCw className="w-4 h-4" />}
      {status === 'checking' ? 'Checking...' : 'Check for Updates'}
    </button>
  );
};

export const SettingsPage: React.FC<SettingsPageProps> = ({
  url,
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onClearHistory,
  onPurgeMemory
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'account' | 'appearance' | 'privacy' | 'passwords' | 'extensions' | 'advanced' | 'mcp' | 'shortcuts'>('general');
  const [isPurgingMemory, setIsPurgingMemory] = useState(false);
  const [purgedFeedback, setPurgedFeedback] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [shortcutInputValue, setShortcutInputValue] = useState('');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus());
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [copiedSyncCode, setCopiedSyncCode] = useState(false);

  useEffect(() => {
    const unsub = syncService.subscribe(status => {
      setSyncStatus(status);
    });
    return () => { unsub(); };
  }, []);

  useEffect(() => {
    if (url) {
      if (url.includes('#account') || url.includes('#sync')) setActiveTab('account');
      else if (url.includes('#appearance')) setActiveTab('appearance');
      else if (url.includes('#privacy')) setActiveTab('privacy');
      else if (url.includes('#passwords')) setActiveTab('passwords');
      else if (url.includes('#advanced')) setActiveTab('advanced');
      else if (url.includes('#extensions')) setActiveTab('extensions');
      else if (url.includes('#mcp')) setActiveTab('mcp');
      else if (url.includes('#shortcuts')) setActiveTab('shortcuts');
      else if (url.includes('#general')) setActiveTab('general');
    }
  }, [url]);

  // MCP Server state
  const [mcpStatus, setMcpStatus] = useState<{ running: boolean; port: number; clientCount: number; clients: any[] } | null>(null);
  const [mcpToken, setMcpToken] = useState<string>('');
  const [mcpTokenVisible, setMcpTokenVisible] = useState(false);
  const [disabledTools, setDisabledTools] = useState<string[]>([]);
  const [mcpCopied, setMcpCopied] = useState(false);
  const [tokenCopied, setTokenCopied] = useState(false);
  const [aiCacheStatus, setAiCacheStatus] = useState<string>('');
  const [isClearingCache, setIsClearingCache] = useState<boolean>(false);

  const handleClearAiCache = async () => {
    if (!window.confirm('Clear all downloaded local AI model files and temporary cache?')) return;
    setIsClearingCache(true);
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        for (const k of keys) {
          await window.caches.delete(k);
        }
      }
      if ((window as any).electronAPI?.clearAiModelsCache) {
        await (window as any).electronAPI.clearAiModelsCache();
      }
      setAiCacheStatus('AI model cache cleared successfully!');
      setTimeout(() => setAiCacheStatus(''), 4000);
    } catch (e: any) {
      setAiCacheStatus('Failed to clear cache: ' + (e?.message || String(e)));
    } finally {
      setIsClearingCache(false);
    }
  };

  const [extensions, setExtensions] = useState<any[]>([]);

  const fetchMcpStatus = useCallback(async () => {
    if ((window as any).electronAPI?.getMcpStatus) {
      const status = await (window as any).electronAPI.getMcpStatus();
      setMcpStatus(status);
    }
    if ((window as any).electronAPI?.getMcpToken) {
      setMcpToken(await (window as any).electronAPI.getMcpToken());
    }
    if ((window as any).electronAPI?.getMcpToolSettings) {
      setDisabledTools(await (window as any).electronAPI.getMcpToolSettings());
    }
    
    // Fetch extensions
    if ((window as any).electronAPI?.listExtensions) {
      setExtensions(await (window as any).electronAPI.listExtensions() || []);
    }
  }, []);

  useEffect(() => {
    fetchMcpStatus();

    let cleanup: (() => void) | void;
    let cleanupStatus: (() => void) | void;
    let cleanupExt: (() => void) | void;
    if ((window as any).electronAPI?.onMcpClientChanged) {
      cleanup = (window as any).electronAPI.onMcpClientChanged((_: any, data: any) => {
        setMcpStatus(prev => prev ? { ...prev, clientCount: data.count, clients: data.clients } : null);
      });
    }
    if ((window as any).electronAPI?.onMcpStatusChanged) {
      cleanupStatus = (window as any).electronAPI.onMcpStatusChanged((_: any, isRunning: boolean) => {
        setMcpStatus(prev => prev ? { ...prev, running: isRunning } : { running: isRunning, port: 3020, clientCount: 0, clients: [] });
      });
    }
    if ((window as any).electronAPI?.onExtensionChanged) {
      cleanupExt = (window as any).electronAPI.onExtensionChanged(async () => {
        if ((window as any).electronAPI?.listExtensions) {
          const list = await (window as any).electronAPI.listExtensions();
          setExtensions(list || []);
        }
      });
    }
    return () => {
      if (typeof cleanup === 'function') cleanup();
      if (typeof cleanupStatus === 'function') cleanupStatus();
      if (typeof cleanupExt === 'function') cleanupExt();
    };
  }, [fetchMcpStatus]);

  const handleToggleMcp = async () => {
    const isRunning = mcpStatus?.running || false;
    if (isRunning) {
      await (window as any).electronAPI?.stopMcpServer?.();
    } else {
      await (window as any).electronAPI?.startMcpServer?.();
    }
    setTimeout(fetchMcpStatus, 300);
  };

  const handleRotateToken = async () => {
    if ((window as any).electronAPI?.rotateMcpToken) {
      const newToken = await (window as any).electronAPI.rotateMcpToken();
      setMcpToken(newToken);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(mcpToken);
    setTokenCopied(true);
    setTimeout(() => setTokenCopied(false), 2000);
  };

  const handleToggleTool = async (toolName: string, currentlyDisabled: boolean) => {
    if ((window as any).electronAPI?.setMcpToolEnabled) {
      await (window as any).electronAPI.setMcpToolEnabled(toolName, currentlyDisabled); // true means enable it, false means disable it
      fetchMcpStatus();
    }
  };

  const handleToggleExtension = async (extId: string, currentEnabled: boolean) => {
    try {
      const nextState = !currentEnabled;
      if ((window as any).electronAPI?.toggleExtension) {
        await (window as any).electronAPI.toggleExtension(extId, nextState);
      }
      setExtensions(prev => prev.map(e => e.id === extId ? { ...e, enabled: nextState } : e));
    } catch (e) {
      console.error('Failed to toggle extension:', e);
    }
  };

  const handleRemoveExtension = async (ext: any) => {
    if (window.confirm(`Are you sure you want to remove "${ext.name}"?`)) {
      try {
        const res = await (window as any).electronAPI?.removeExtension?.(ext.id);
        if (res?.error) {
          alert('Failed to remove extension: ' + res.error);
          return;
        }
        setExtensions(prev => prev.filter(e => e.id !== ext.id));
      } catch (e) {
        console.error('Failed to remove extension:', e);
      }
    }
  };

  const mcpConfigSnippet = `{
  "mcpServers": {
    "nova-browser": {
      "url": "http://localhost:${mcpStatus?.port || 3020}/sse?token=${mcpToken}"
    }
  }
}`;

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(mcpConfigSnippet);
    setMcpCopied(true);
    setTimeout(() => setMcpCopied(false), 2000);
  };

  const MCP_TOOLS = [
    { name: 'browser_navigate', desc: 'Navigate to a URL', level: 'safe' },
    { name: 'browser_read_page', desc: 'Extract full page text + links', level: 'safe' },
    { name: 'browser_screenshot', desc: 'Take a screenshot', level: 'safe' },
    { name: 'browser_list_tabs', desc: 'List all open tabs', level: 'safe' },
    { name: 'browser_get_url', desc: 'Get the current tab URL', level: 'safe' },
    { name: 'browser_scroll', desc: 'Scroll the page up/down/top/bottom', level: 'safe' },
    { name: 'browser_go_back', desc: 'Navigate back in history', level: 'safe' },
    { name: 'browser_go_forward', desc: 'Navigate forward in history', level: 'safe' },
    { name: 'browser_reload', desc: 'Reload the current page', level: 'safe' },
    { name: 'browser_wait', desc: 'Wait for N milliseconds', level: 'safe' },
    { name: 'browser_get_element_text', desc: 'Get an element\'s text content', level: 'safe' },
    { name: 'browser_scroll_to_element', desc: 'Scroll until element is visible', level: 'safe' },

    { name: 'browser_click', desc: 'Click an element by CSS selector', level: 'medium' },
    { name: 'browser_hover', desc: 'Hover over an element', level: 'medium' },
    { name: 'browser_focus', desc: 'Focus an element', level: 'medium' },
    { name: 'browser_switch_tab', desc: 'Switch to a tab by ID', level: 'medium' },
    { name: 'browser_close_tab', desc: 'Close a tab by ID', level: 'medium' },
    { name: 'browser_new_tab', desc: 'Open a new tab', level: 'medium' },
    { name: 'browser_mute_tab', desc: 'Mute or unmute the active tab', level: 'medium' },
    { name: 'browser_pin_tab', desc: 'Pin or unpin the active tab', level: 'medium' },
    { name: 'browser_duplicate_tab', desc: 'Duplicate the active tab', level: 'medium' },
    { name: 'browser_zoom', desc: 'Set page zoom level', level: 'medium' },

    { name: 'browser_type', desc: 'Type text into an input', level: 'sensitive' },
    { name: 'browser_press_key', desc: 'Simulate a keyboard key press', level: 'sensitive' },
    { name: 'browser_select_option', desc: 'Select a dropdown option', level: 'sensitive' },
  ];

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'account', label: 'Nova Sync', icon: Cloud },
    { id: 'appearance', label: 'Appearance', icon: Paintbrush },
    { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
    { id: 'passwords', label: 'Passwords', icon: Key },
    { id: 'extensions', label: 'Extensions', icon: Puzzle },
    { id: 'advanced', label: 'Advanced', icon: Bot },
    { id: 'mcp', label: 'MCP Server', icon: Cpu },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ] as const;

  return (
    <div className="w-full h-full bg-slate-50 dark:bg-slate-900 overflow-hidden flex font-sans selection:bg-blue-500/30">
      
      {/* Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl flex flex-col">
        <div className="p-6 pb-2">
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Settings
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                    : 'text-slate-600 hover:bg-slate-200/50 dark:text-slate-400 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-8 py-12 space-y-12">
          
          {/* GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">About Nova</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Nova Browser</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Version 1.0.0 (Open Source Edition)</p>
                  </div>
                  <UpdateWidget />
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">On Startup</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex flex-col sm:flex-row gap-2">
                  {[
                    { id: 'newTab', label: 'Open New Tab Page' },
                    { id: 'continue', label: 'Continue where you left off' },
                    { id: 'specificPages', label: 'Open a specific page' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ startupBehavior: opt.id as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        settings.startupBehavior === opt.id || (!settings.startupBehavior && opt.id === 'newTab')
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Search Engine</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1">
                    {[
                      { id: 'google', name: 'Google', desc: 'Fast & Accurate' },
                      { id: 'duckduckgo', name: 'DuckDuckGo', desc: 'Privacy focused' },
                      { id: 'brave', name: 'Brave Search', desc: 'Independent index' },
                      { id: 'bing', name: 'Bing', desc: 'AI powered' },
                      { id: 'ecosia', name: 'Ecosia', desc: 'Plant trees' },
                      { id: 'yahoo', name: 'Yahoo', desc: 'Classic search' }
                    ].map(engine => (
                      <button
                        key={engine.id}
                        onClick={() => onUpdateSettings({ searchEngine: engine.id as any })}
                        className={`p-4 rounded-xl text-left transition-all ${
                          settings.searchEngine === engine.id
                            ? 'bg-blue-50 dark:bg-blue-500/10 ring-1 ring-blue-500 text-blue-900 dark:text-blue-100'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <p className="font-semibold">{engine.name}</p>
                        <p className={`text-xs mt-1 ${settings.searchEngine === engine.id ? 'text-blue-700/70 dark:text-blue-400/70' : 'text-slate-500 dark:text-slate-400'}`}>{engine.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Page Translation</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Default Target Language</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Foreign web pages will be translated to this language in 1-click.</p>
                    </div>
                    <select
                      value={settings.defaultTranslationLanguage || 'en'}
                      onChange={(e) => onUpdateSettings({ defaultTranslationLanguage: e.target.value })}
                      className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="en">English</option>
                      <option value="tr">Turkish (Türkçe)</option>
                      <option value="de">German (Deutsch)</option>
                      <option value="fr">French (Français)</option>
                      <option value="es">Spanish (Español)</option>
                      <option value="it">Italian (Italiano)</option>
                      <option value="ru">Russian (Русский)</option>
                      <option value="ar">Arabic (العربية)</option>
                      <option value="ja">Japanese (日本語)</option>
                      <option value="zh">Chinese (中文)</option>
                      <option value="az">Azərbaycan (Azerbaycan)</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Font Size</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
                  {(['small', 'medium', 'large'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => onUpdateSettings({ fontSize: size })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium capitalize transition-all ${
                        settings.fontSize === size
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Clear Browsing Data</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear History & Cache</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Clear your browsing history, cookies, cache, and more.</p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to clear your browsing history?")) {
                        if (onClearHistory) {
                          onClearHistory();
                        } else {
                          localStorage.removeItem('browsing_history');
                        }
                        alert("Browsing history cleared.");
                      }
                    }}
                    className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 rounded-xl font-medium transition-colors text-sm"
                  >
                    Clear Data
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* NOVA ACCOUNT & SYNC */}
          {activeTab === 'account' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
              <section className="space-y-6">
                <div className="border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-sm shadow-cyan-500/20">
                      <Cloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                        Nova Cloud Sync
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Access your bookmarks, saved passwords, browsing history, and settings from any computer.
                      </p>
                    </div>
                  </div>
                </div>

                {syncMsg && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2.5">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{syncMsg}</span>
                  </div>
                )}
                {syncErr && (
                  <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{syncErr}</span>
                  </div>
                )}

                {syncStatus.isLoggedIn ? (
                  /* ACTIVE SYNC CHAIN VIEW */
                  <div className="space-y-6">
                    {/* Active Sync Code Banner */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-cyan-500/20">
                          <Link2 className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Sync Chain Active</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> E2EE Protected
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Code: <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{syncStatus.syncCode || 'Active Device'}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                            Status: <span className="text-emerald-500 font-medium">● Connected</span> · Last synced: {syncStatus.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={async () => {
                            setSyncErr(null);
                            setSyncMsg(null);
                            setSyncLoading(true);
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              await syncService.syncData({
                                bookmarks: rawB ? JSON.parse(rawB) : [],
                                folders: rawF ? JSON.parse(rawF) : [],
                                history: rawH ? JSON.parse(rawH) : [],
                                passwords: rawP ? JSON.parse(rawP) : [],
                                settings: rawS ? JSON.parse(rawS) : ({} as any),
                                workspaces: rawW ? JSON.parse(rawW) : []
                              });

                              setSyncMsg('Sync completed successfully!');
                              setTimeout(() => setSyncMsg(null), 3000);
                            } catch (e: any) {
                              setSyncErr(e.message || 'Sync failed');
                            } finally {
                              setSyncLoading(false);
                            }
                          }}
                          disabled={syncLoading}
                          className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncLoading ? 'animate-spin' : ''}`} />
                          <span>{syncLoading ? 'Syncing...' : 'Sync Now'}</span>
                        </button>

                        <button
                          onClick={() => syncService.logout()}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-red-50 hover:text-red-600 dark:bg-slate-700/50 dark:hover:bg-red-500/10 dark:text-slate-300 dark:hover:text-red-400 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Leave Chain
                        </button>
                      </div>
                    </div>

                    {/* Pair Another Device Card */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                            <Laptop className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Pair Another Computer</h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500">Use your unique sync code to link other laptops or desktops.</p>
                          </div>
                        </div>

                        <button
                          onClick={async () => {
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              const code = await syncService.generateSyncChainCode({
                                bookmarks: rawB ? JSON.parse(rawB) : [],
                                folders: rawF ? JSON.parse(rawF) : [],
                                history: rawH ? JSON.parse(rawH) : [],
                                passwords: rawP ? JSON.parse(rawP) : [],
                                settings: rawS ? JSON.parse(rawS) : ({} as any),
                                workspaces: rawW ? JSON.parse(rawW) : []
                              });

                              navigator.clipboard.writeText(code);
                              setCopiedSyncCode(true);
                              setSyncMsg(`Sync Code Copied to Clipboard: ${code}`);
                              setTimeout(() => setCopiedSyncCode(false), 3000);
                            } catch (err: any) {
                              setSyncErr(err.message || 'Failed to generate code');
                            }
                          }}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-700/60 hover:bg-cyan-500 hover:text-white dark:hover:bg-cyan-500 dark:hover:text-white text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>{copiedSyncCode ? 'Code Copied!' : 'Copy Device Code'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Synced Categories List */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 space-y-4 shadow-sm">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Synchronized Data Categories
                      </h4>

                      <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {[
                          { key: 'syncBookmarks', label: 'Bookmarks & Folders', icon: Bookmark, desc: 'Your saved bookmarks and toolbar folders' },
                          { key: 'syncPasswords', label: 'Saved Passwords (E2EE)', icon: Key, desc: 'Zero-knowledge client-side encrypted with AES-256' },
                          { key: 'syncHistory', label: 'Browsing History', icon: Cloud, desc: 'Your visited page history across devices' },
                          { key: 'syncSettings', label: 'Settings & Appearance', icon: Settings, desc: 'Themes, search engine, shortcuts' },
                          { key: 'syncWorkspaces', label: 'Workspaces', icon: FolderTree, desc: 'Custom tab workspaces and icons' },
                        ].map(item => {
                          const isChecked = syncStatus.user?.syncPreferences[item.key as keyof SyncPreferences] ?? true;
                          const Icon = item.icon;

                          return (
                            <div 
                              key={item.key} 
                              onClick={() => {
                                if (syncStatus.user) {
                                  syncService.updatePreferences({ [item.key]: !isChecked });
                                }
                              }}
                              className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 cursor-pointer hover:opacity-80 transition-opacity"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">{item.label}</span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">{item.desc}</span>
                                </div>
                              </div>

                              <div className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isChecked ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* PAIRING SETUP (NO EMAIL / NO PASSWORD) */
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Option 1: Enter Code */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Laptop className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          I have a Sync Code
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Enter the pairing code generated from your other computer to sync all bookmarks, passwords, and history instantly.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <input
                          type="text"
                          placeholder="nova-xxxx-xxxx-xxxx-xxxx"
                          id="quick-pair-input"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:border-cyan-500 font-mono"
                        />
                        <button
                          onClick={async () => {
                            const input = document.getElementById('quick-pair-input') as HTMLInputElement;
                            if (!input || !input.value.trim()) return;
                            setSyncLoading(true);
                            try {
                              await syncService.joinSyncChain(input.value.trim());
                              setSyncMsg('Device paired successfully! Data synced.');
                            } catch (err: any) {
                              setSyncErr(err.message || 'Invalid or expired sync code');
                            } finally {
                              setSyncLoading(false);
                            }
                          }}
                          className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
                        >
                          <Link2 className="w-4 h-4" />
                          <span>Connect & Sync</span>
                        </button>
                      </div>
                    </div>

                    {/* Option 2: Generate Code on This Computer */}
                    <div className="premium-card bg-white dark:bg-slate-800/60 rounded-3xl border border-slate-200 dark:border-slate-700/60 p-6 flex flex-col justify-between space-y-6 shadow-sm">
                      <div className="space-y-3">
                        <div className="p-3 w-fit rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                          Start New Sync Chain
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Generate a secure 1-click pairing code on this computer to link your other laptops or desktops.
                        </p>
                      </div>

                      <div className="space-y-3 pt-2">
                        <button
                          onClick={async () => {
                            try {
                              const rawB = localStorage.getItem('bookmarks');
                              const rawF = localStorage.getItem('folders_session');
                              const rawH = localStorage.getItem('browsing_history');
                              const rawP = await (window as any).electronAPI?.secureStoreGet?.('passwords');
                              const rawW = localStorage.getItem('workspaces_session');
                              const rawS = localStorage.getItem('user_settings');

                              const code = await syncService.generateSyncChainCode({
                                bookmarks: rawB ? JSON.parse(rawB) : [],
                                folders: rawF ? JSON.parse(rawF) : [],
                                history: rawH ? JSON.parse(rawH) : [],
                                passwords: rawP ? JSON.parse(rawP) : [],
                                settings: rawS ? JSON.parse(rawS) : ({} as any),
                                workspaces: rawW ? JSON.parse(rawW) : []
                              });

                              navigator.clipboard.writeText(code);
                              setCopiedSyncCode(true);
                              setSyncMsg(`Sync Code: ${code} (Copied to clipboard!)`);
                              setTimeout(() => setCopiedSyncCode(false), 4000);
                            } catch (err: any) {
                              setSyncErr(err.message || 'Failed to generate code');
                            }
                          }}
                          className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                        >
                          <Sparkles className="w-4 h-4 text-cyan-400 dark:text-cyan-600" />
                          <span>{copiedSyncCode ? 'Sync Code Copied!' : 'Generate Sync Code'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {/* APPEARANCE */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Theme Mode</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 flex gap-2">
                  {[
                    { id: 'light', label: 'Light' },
                    { id: 'dark', label: 'Dark' },
                    { id: 'system', label: 'System Default' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ theme: opt.id as any })}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        settings.theme === opt.id || (!settings.theme && opt.id === 'system')
                          ? 'bg-slate-900 text-white shadow-md dark:bg-blue-600 dark:text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tab Style</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { id: 'floating', name: 'Floating', desc: 'Modern & Detached' },
                    { id: 'rounded', name: 'Rounded', desc: 'Classic Chrome Style' },
                    { id: 'square', name: 'Square', desc: 'Compact & Sharp' }
                  ].map(ts => (
                    <button
                      key={ts.id}
                      onClick={() => onUpdateSettings({ tabStyle: ts.id as any })}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${
                        settings.tabStyle === ts.id || (!settings.tabStyle && ts.id === 'floating')
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100'
                          : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                      }`}
                    >
                      <div className="w-full h-8 bg-slate-100 dark:bg-slate-800 rounded-md relative flex items-end justify-center overflow-hidden border border-slate-200 dark:border-slate-700">
                        {ts.id === 'floating' && <div className="w-16 h-5 bg-white dark:bg-slate-700 rounded-md mb-1 shadow-sm" />}
                        {ts.id === 'rounded' && <div className="w-16 h-6 bg-white dark:bg-slate-700 rounded-t-lg" />}
                        {ts.id === 'square' && <div className="w-16 h-6 bg-white dark:bg-slate-700" />}
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-sm">{ts.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{ts.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Accent Color</h2>
                <div className="flex gap-4 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                  {[
                    { id: 'blue', color: 'bg-[#3b82f6]' },
                    { id: 'emerald', color: 'bg-[#10b981]' },
                    { id: 'purple', color: 'bg-[#a855f7]' },
                    { id: 'rose', color: 'bg-[#f43f5e]' },
                    { id: 'amber', color: 'bg-[#f59e0b]' },
                    { id: 'custom', color: 'bg-slate-200 dark:bg-slate-700' }
                  ].map(c => (
                    <button
                      key={c.id}
                      onClick={() => onUpdateSettings({ accentColor: c.id as any })}
                      className={`w-12 h-12 rounded-full ${c.color} shadow-lg transition-transform hover:scale-110 flex items-center justify-center relative`}
                    >
                      {c.id === 'custom' && (
                        <div 
                          className="absolute inset-0 rounded-full flex items-center justify-center" 
                          style={{ backgroundColor: settings.customAccentColor || '#3b82f6' }} 
                        />
                      )}
                      {settings.accentColor === c.id && <div className="w-4 h-4 bg-white rounded-full opacity-90 z-10" />}
                    </button>
                  ))}
                </div>
                {settings.accentColor === 'custom' && (
                  <div className="mt-4 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Color Picker:</label>
                    <input 
                      type="color" 
                      value={settings.customAccentColor || '#3b82f6'}
                      onChange={(e) => onUpdateSettings({ customAccentColor: e.target.value })}
                      className="w-12 h-12 rounded cursor-pointer border-none p-0 bg-transparent"
                    />
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">New Tab Background</h2>

                <div className="grid grid-cols-2 gap-4">
                  {BACKGROUND_OPTIONS.map(bg => (
                    <BackgroundPreviewCard
                      key={bg.id}
                      bg={bg}
                      isSelected={settings.newTabBackground === bg.id || (!settings.newTabBackground && bg.id === 'default')}
                      onSelect={() => onUpdateSettings({ newTabBackground: bg.id as any })}
                    />
                  ))}
                </div>

                {settings.newTabBackground === 'unsplash' && (
                  <DailyWallpaperSection />
                )}
                {settings.newTabBackground === 'custom_url' && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Video / Image URL:</label>
                    <input 
                      type="text" 
                      value={settings.backgroundCustomUrl || ''}
                      onChange={(e) => onUpdateSettings({ backgroundCustomUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-blue-500"
                      placeholder="e.g. https://example.com/video.mp4"
                    />
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Layout & Navigation</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bookmarks Bar</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show favorite sites below address bar</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ showBookmarksBar: !settings.showBookmarksBar })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showBookmarksBar ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showBookmarksBar ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vertical Tabs</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Display tabs on the left sidebar instead of the top</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ useVerticalTabs: !settings.useVerticalTabs })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.useVerticalTabs ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.useVerticalTabs ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Tasks Widget</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Show tasks and to-do list on the New Tab Page</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ showTasksWidget: settings.showTasksWidget === false ? true : false })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.showTasksWidget !== false ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showTasksWidget !== false ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* PRIVACY */}
          {activeTab === 'privacy' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <div className="p-6 flex items-start gap-4">
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Ad & Tracker Blocking</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6 max-w-lg">
                        Nova's Privacy Shield blocks malicious scripts, tracking cookies, and intrusive ads across all websites. It uses Ghostery and Cliqz blocklists to keep your browsing fast and secure.
                      </p>
                      
                      <button
                        onClick={() => onUpdateSettings({ privacyShield: !settings.privacyShield })}
                        className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                          settings.privacyShield 
                            ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/20' 
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'
                        }`}
                      >
                        {settings.privacyShield ? 'Shield is Active' : 'Enable Shield'}
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Tracking & Cookies</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Send a "Do Not Track" request</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Request that your browsing traffic is not tracked</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ doNotTrack: !settings.doNotTrack })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.doNotTrack ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.doNotTrack ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Clear cookies on exit</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Clear cookies and site data when you close all windows</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ clearOnExit: !settings.clearOnExit })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.clearOnExit ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.clearOnExit ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Storage & Model Cache</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-5 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Purge AI Model Cache</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Delete downloaded local WebLLM neural network weights to free up disk space</div>
                    {aiCacheStatus && (
                      <div className={`text-xs mt-2 font-medium ${aiCacheStatus.includes('successfully') ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                        {aiCacheStatus}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleClearAiCache}
                    disabled={isClearingCache}
                    className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-500/10 dark:hover:bg-red-500/20 dark:text-red-400 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {isClearingCache ? 'Clearing...' : 'Clear AI Cache'}
                  </button>
                </div>
              </section>
            </div>
          )}

          {/* PASSWORDS */}
          {activeTab === 'passwords' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Saved Passwords</h2>
                </div>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden">
                  <PasswordList />
                </div>
              </section>
            </div>
          )}

          {/* ADVANCED */}
          {activeTab === 'advanced' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">AI Features</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">AI Link Preview (Hover Summaries)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Automatically reads and summarizes links when you hover over them. (Uses local WebLLM)</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ aiLinkPreviewEnabled: !settings.aiLinkPreviewEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.aiLinkPreviewEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.aiLinkPreviewEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Password Manager */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Password Manager</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Offer to save and autofill passwords on websites. Credentials are encrypted on this device.</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ passwordManagerEnabled: !settings.passwordManagerEnabled })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.passwordManagerEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.passwordManagerEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Memory & Performance</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50 mb-8">
                  {/* Automatic Tab Hibernation */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Automatic Tab Hibernation (Memory Saver)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Unloads inactive background tabs from RAM to keep the browser lightning fast</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ tabHibernationEnabled: !(settings.tabHibernationEnabled ?? true) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(settings.tabHibernationEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.tabHibernationEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {(settings.tabHibernationEnabled ?? true) && (
                    <div className="p-5 flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hibernation Inactivity Timeout</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Time after which unused tabs are suspended to save RAM</div>
                      </div>
                      <select
                        value={settings.hibernationTimeoutMinutes ?? 10}
                        onChange={(e) => onUpdateSettings({ hibernationTimeoutMinutes: Number(e.target.value) })}
                        className="bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={60}>1 hour</option>
                      </select>
                    </div>
                  )}

                  {/* Energy Saver Mode */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Energy Saver Mode (Battery & CPU)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Throttles heavy background canvas shaders and limits particle effects to extend laptop battery life</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ energySaverMode: !(settings.energySaverMode ?? false) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.energySaverMode ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.energySaverMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Link Preload & DNS Prefetching */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">DNS Prefetching & Link Pre-warming (Speed Booster)</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Pre-resolves domain names and opens anticipatory sockets on link hover for instant page loads</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ preloadDnsEnabled: !(settings.preloadDnsEnabled ?? true) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(settings.preloadDnsEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.preloadDnsEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Smooth Scrolling Engine */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Hardware-Accelerated Smooth Scrolling</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Interpolates page scrolling with GPU composited physics for high refresh rate monitors</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ smoothScrollingEnabled: !(settings.smoothScrollingEnabled ?? true) })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${(settings.smoothScrollingEnabled ?? true) ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${(settings.smoothScrollingEnabled ?? true) ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  {/* Instant Memory Purge Action */}
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Instant RAM & Cache Purge</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Immediately hibernates all background tabs, clears thumbnail cache, and triggers V8 garbage collection</div>
                    </div>
                    <button
                      onClick={async () => {
                        setIsPurgingMemory(true);
                        try {
                          if (onPurgeMemory) await onPurgeMemory();
                        } catch (_) {}
                        setTimeout(() => {
                          setIsPurgingMemory(false);
                          setPurgedFeedback(true);
                          setTimeout(() => setPurgedFeedback(false), 3000);
                        }, 500);
                      }}
                      disabled={isPurgingMemory}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95 disabled:opacity-50"
                    >
                      {isPurgingMemory ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                          <span>Purging RAM...</span>
                        </>
                      ) : purgedFeedback ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">RAM Purged!</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Purge RAM Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">System & Developer</h2>
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Use hardware acceleration</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use GPU to render web pages faster (requires restart)</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ hardwareAcceleration: !settings.hardwareAcceleration })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.hardwareAcceleration ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.hardwareAcceleration ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  
                  <div className="p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">Developer Mode</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enable "Inspect Element" in right-click menu and advanced tools</div>
                    </div>
                    <button
                      onClick={() => onUpdateSettings({ developerMode: !settings.developerMode })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.developerMode ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.developerMode ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>



              <section>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Backup & Restore</h2>
                <div className="flex gap-4">
                  <button
                    onClick={onExportData}
                    className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-blue-500 dark:hover:border-blue-500 transition-colors flex flex-col items-center justify-center gap-3 group"
                  >
                    <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/20 rounded-full flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                      <Download className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Export Backup</p>
                      <p className="text-xs text-slate-500 mt-1">Save bookmarks & settings to a JSON file</p>
                    </div>
                  </button>

                  <label className="flex-1 bg-white dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-3 group cursor-pointer">
                    <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">Import Backup</p>
                      <p className="text-xs text-slate-500 mt-1">Restore from a JSON backup file</p>
                    </div>
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && onImportData) onImportData(file);
                      }}
                    />
                  </label>
                </div>
              </section>

            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="p-8 space-y-8 max-w-3xl">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                    <Cpu className="w-6 h-6 text-blue-500" />
                    MCP Server
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">Model Context Protocol — Let AI tools control Nova Browser</p>
                </div>
                <button
                  onClick={handleToggleMcp}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    mcpStatus?.running
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400'
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-400'
                  }`}
                >
                  {mcpStatus?.running ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  {mcpStatus?.running ? 'Stop Server' : 'Start Server'}
                </button>
              </div>

              {/* Status Card */}
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${mcpStatus?.running ? 'bg-green-500 animate-pulse' : 'bg-slate-400'}`} />
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {mcpStatus?.running ? 'Running' : 'Stopped'}
                    </span>
                    {mcpStatus?.running && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                        http://localhost:{mcpStatus.port}/sse
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{mcpStatus?.clientCount || 0} connected</span>
                  </div>
                </div>

                {/* Connected clients list */}
                {(mcpStatus?.clients?.length || 0) > 0 && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Connected Clients</p>
                    {mcpStatus!.clients.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-slate-700 dark:text-slate-300 truncate">{c.userAgent}</span>
                        <span className="text-slate-400 text-xs ml-auto">
                          {Math.round((Date.now() - c.connectedAt) / 1000)}s ago
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* API Token Card */}
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-100">API Token Authentication</p>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type={mcpTokenVisible ? "text" : "password"}
                    value={mcpToken}
                    readOnly
                    className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-600 dark:text-slate-300 focus:outline-none focus:border-purple-500 font-mono"
                  />
                  <button
                    onClick={() => setMcpTokenVisible(!mcpTokenVisible)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title={mcpTokenVisible ? "Hide Token" : "Show Token"}
                  >
                    {mcpTokenVisible ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={handleCopyToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {tokenCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleRotateToken}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 text-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                    title="Revoke old token and generate a new one"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Rotate
                  </button>
                </div>
                <p className="text-xs text-slate-500">This token is required for all MCP clients to connect securely.</p>
              </div>

              {/* Config snippet */}
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-100">Setup Guide</p>
                    <p className="text-xs text-slate-500 mt-0.5">Add this to your AI tool's MCP config (e.g., claude_desktop_config.json)</p>
                  </div>
                  <button
                    onClick={handleCopyConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                  >
                    {mcpCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {mcpCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-slate-950 text-green-400 text-sm rounded-xl p-4 font-mono overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                  {mcpConfigSnippet}
                </pre>
              </div>

              {/* Tools list & Permissions */}
              <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-orange-500" />
                  <p className="font-semibold text-slate-800 dark:text-slate-100">Tool Permissions ({MCP_TOOLS.length})</p>
                </div>
                <p className="text-xs text-slate-500 mb-2">Enable or disable specific browser capabilities. Sensitive actions are disabled by default.</p>
                <div className="grid grid-cols-1 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                  {MCP_TOOLS.map(tool => {
                    const isDisabled = disabledTools.includes(tool.name);
                    let badgeClass = "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
                    let badgeText = "Safe";
                    if (tool.level === 'medium') {
                      badgeClass = "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400";
                      badgeText = "Medium";
                    } else if (tool.level === 'sensitive') {
                      badgeClass = "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
                      badgeText = "Sensitive";
                    }

                    return (
                      <div key={tool.name} className={`flex items-center justify-between py-2 px-3 rounded-lg border transition-colors ${isDisabled ? 'bg-slate-50 border-slate-200 dark:bg-slate-800/30 dark:border-slate-700/50 opacity-60' : 'bg-white border-slate-200 dark:bg-slate-800/50 dark:border-slate-700/50'}`}>
                        <div className="flex flex-col gap-1 pr-4 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono font-medium truncate">{tool.name}</code>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeClass}`}>{badgeText}</span>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{tool.desc}</span>
                        </div>
                        <button
                          onClick={() => handleToggleTool(tool.name, isDisabled)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isDisabled ? (tool.level === 'sensitive' ? 'bg-orange-500' : 'bg-blue-500') : 'bg-slate-200 dark:bg-slate-600'}`}
                          role="switch"
                          aria-checked={!isDisabled}
                        >
                          <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!isDisabled ? 'translate-x-4' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SHORTCUTS */}
          {activeTab === 'shortcuts' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section>
                <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Keyboard Shortcuts</h2>
                  <button 
                    onClick={() => {
                      onUpdateSettings({ 
                        shortcuts: {
                          newTab: { key: 't', shift: false, meta: true },
                          reopenTab: { key: 't', shift: true, meta: true },
                          closeTab: { key: 'w', shift: false, meta: true },
                          newIncognito: { key: 'n', shift: true, meta: true },
                          reload: { key: 'r', shift: false, meta: true },
                          omnibox: { key: 'l', shift: false, meta: true },
                          bookmark: { key: 'd', shift: false, meta: true },
                          history: { key: 'h', shift: false, meta: true },
                          downloads: { key: 'j', shift: false, meta: true },
                          findInPage: { key: 'f', shift: false, meta: true },
                        }
                      });
                    }}
                    className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                  >
                    Reset Defaults
                  </button>
                </div>
                
                <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-2 divide-y divide-slate-100 dark:divide-slate-700/50">
                  {[
                    { id: 'newTab', label: 'New Tab' },
                    { id: 'reopenTab', label: 'Reopen Closed Tab' },
                    { id: 'closeTab', label: 'Close Active Tab' },
                    { id: 'newIncognito', label: 'New Incognito Window' },
                    { id: 'reload', label: 'Reload Page' },
                    { id: 'omnibox', label: 'Focus Address Bar' },
                    { id: 'bookmark', label: 'Bookmark Page' },
                    { id: 'history', label: 'Open History' },
                    { id: 'downloads', label: 'Open Downloads' },
                    { id: 'findInPage', label: 'Find in Page' },
                  ].map(action => {
                    const currentBinding = settings.shortcuts?.[action.id as keyof typeof settings.shortcuts] || { key: '?', meta: true };
                    
                    const formatBinding = (b: { key: string, shift?: boolean, meta?: boolean }) => {
                      let str = '';
                      if (b.meta) str += '⌘/Ctrl + ';
                      if (b.shift) str += 'Shift + ';
                      str += b.key.toUpperCase();
                      return str;
                    };

                    const isEditing = editingShortcut === action.id;

                    const handleSave = () => {
                      if (shortcutInputValue.trim()) {
                        const input = shortcutInputValue.trim();
                        const newBinding = {
                          key: input.toLowerCase(),
                          shift: input.toLowerCase() !== input,
                          meta: true
                        };
                        onUpdateSettings({
                          shortcuts: {
                            ...settings.shortcuts,
                            [action.id]: newBinding
                          } as any
                        });
                      }
                      setEditingShortcut(null);
                      setShortcutInputValue('');
                    };

                    return (
                      <div key={action.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3 group hover:bg-slate-50 dark:hover:bg-slate-700/20 rounded-xl transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{action.label}</p>
                          <p className="text-xs text-slate-500">ID: {action.id}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-mono text-slate-500">⌘/Ctrl +</span>
                              <input 
                                type="text"
                                autoFocus
                                maxLength={2}
                                value={shortcutInputValue}
                                onChange={e => setShortcutInputValue(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') handleSave();
                                  if (e.key === 'Escape') setEditingShortcut(null);
                                }}
                                onBlur={handleSave}
                                placeholder="Key..."
                                className="w-16 px-2 py-1 bg-white dark:bg-slate-900 border border-blue-500 rounded-lg text-xs font-mono outline-none"
                              />
                            </div>
                          ) : (
                            <>
                              <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-medium text-slate-600 dark:text-slate-300 shadow-sm min-w-[100px] text-center">
                                {formatBinding(currentBinding)}
                              </div>
                              <button
                                onClick={() => {
                                  setShortcutInputValue(currentBinding.shift ? currentBinding.key.toUpperCase() : currentBinding.key.toLowerCase());
                                  setEditingShortcut(action.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Edit Shortcut"
                              >
                                <Keyboard className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {activeTab === 'extensions' && (
            <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-slate-800 dark:text-slate-100">
                    <div className="p-2 bg-accent/20 dark:bg-accent/20 text-accent-hover dark:text-accent rounded-xl shadow-inner">
                      <Puzzle className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold tracking-tight">Extensions</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Manage and configure your browser extensions.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        try {
                          if ((window as any).electronAPI?.selectExtensionFolder && (window as any).electronAPI?.installExtension) {
                            const result = await (window as any).electronAPI.selectExtensionFolder();
                            if (!result.canceled && result.folderPath) {
                              const installRes = await (window as any).electronAPI.installExtension(result.folderPath);
                              if (installRes.error) {
                                alert('Failed to load extension: ' + installRes.error);
                              } else {
                                const list = await (window as any).electronAPI.listExtensions();
                                setExtensions(list || []);
                              }
                            }
                          }
                        } catch (e: any) {
                          console.error(e);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Load Unpacked
                    </button>
                    <button
                      onClick={() => {
                        window.open('https://chromewebstore.google.com/', '_blank');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Chrome Web Store
                    </button>
                  </div>
                </div>

                {/* Extension Management */}
                {(!extensions || extensions.length === 0) ? (
                  <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-900 rounded-full flex items-center justify-center text-slate-400">
                      <Puzzle className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">No extensions installed</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-2">
                        Install extensions from the Chrome Web Store or load an unpacked extension folder from your machine.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => window.open('https://chromewebstore.google.com/', '_blank')}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-xs font-semibold hover:opacity-95 shadow-md transition-all flex items-center gap-2 cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Explore Chrome Web Store
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="premium-card bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-xs overflow-hidden">
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {extensions.map((ext: any) => (
                        <div key={ext.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-200/50 dark:border-white/5">
                              {ext.iconData ? (
                                <img src={ext.iconData} alt={ext.name} className="w-7 h-7 object-contain" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold uppercase">
                                  {ext.name ? ext.name.charAt(0) : <Puzzle className="w-5 h-5" />}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{ext.name}</span>
                                {ext.version && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-mono">
                                    v{ext.version}
                                  </span>
                                )}
                                {ext.enabled !== false ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                                    Active
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20 font-medium">
                                    Disabled
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{ext.description || 'No description available'}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-1 select-all">ID: {ext.id}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 flex-wrap">
                            {/* Toggle Extension Enable/Disable */}
                            <button
                              onClick={() => handleToggleExtension(ext.id, ext.enabled !== false)}
                              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${ext.enabled !== false ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                              title={ext.enabled !== false ? 'Disable Extension' : 'Enable Extension'}
                            >
                              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${ext.enabled !== false ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>

                            {ext.popupUrl && (
                              <button
                                onClick={(e) => {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const cleanPopup = ext.popupUrl.replace(/^\.?\//, '');
                                  const url = `chrome-extension://${ext.id}/${cleanPopup}`;
                                  if ((window as any).electronAPI?.openExtensionPopup) {
                                    (window as any).electronAPI.openExtensionPopup(url, { x: rect.x, y: rect.y, width: rect.width, height: rect.height });
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/20 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Open Extension Popup"
                              >
                                <Play className="w-3.5 h-3.5 fill-current" />
                                <span>Popup</span>
                              </button>
                            )}
                            {ext.optionsUrl && (
                              <button
                                onClick={() => {
                                  const cleanOptions = ext.optionsUrl.replace(/^\.?\//, '');
                                  window.open(`chrome-extension://${ext.id}/${cleanOptions}`, '_blank');
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                                title="Open Options"
                              >
                                <Settings className="w-3.5 h-3.5" />
                                <span>Options</span>
                              </button>
                            )}
                            <button 
                              onClick={() => handleRemoveExtension(ext)}
                              className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                              title={`Remove ${ext.name}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
