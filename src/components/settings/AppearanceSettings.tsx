import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RotateCcw, 
  Shuffle, 
  Check, 
  Images, 
  Play, 
  Plus 
} from 'lucide-react';
import { UserSettings } from '../../types/browser';
import { useLiveUnsplashPhoto, resolveUnsplashPhoto } from '../../utils/unsplash';

const DailyWallpaperSection = () => {
  const { 
    photo: currentPhoto, 
    photos, 
    isUserOverride, 
    shuffleNext, 
    selectPhoto, 
    resetToDaily 
  } = useLiveUnsplashPhoto();

  return (
    <div className="mt-6 p-5 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm space-y-5 animate-in fade-in slide-in-from-top-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Daily 4K Wallpaper (Ultra HD)
            </h3>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-500 rounded-full border border-blue-500/20">
              3840 × 2160 UHD
            </span>
            {isUserOverride && (
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20">
                Custom Choice
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Automatically updates daily with curated 4K photography. Synchronized across all tabs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isUserOverride && (
            <button
              type="button"
              onClick={resetToDaily}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm cursor-pointer"
              title="Reset to today's official wallpaper"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Today</span>
            </button>
          )}
          <button
            type="button"
            onClick={shuffleNext}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors shadow-sm border border-blue-200/50 dark:border-blue-700/50 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Shuffle Next</span>
          </button>
        </div>
      </div>

      {currentPhoto && (
        <div className="animate-in fade-in slide-in-from-bottom-2">
          <div className="w-full aspect-video max-h-[340px] rounded-xl overflow-hidden bg-slate-900 border border-slate-700 relative group shadow-lg">
            <img 
              src={currentPhoto.imageUrl} 
              alt={currentPhoto.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4">
              <div className="text-white flex items-center justify-between w-full">
                <div className="max-w-[70%]">
                  <p className="text-sm font-bold truncate">{currentPhoto.title}</p>
                  <p className="text-xs text-white/70 truncate">{currentPhoto.author} • {currentPhoto.source} {currentPhoto.resolution ? `(${currentPhoto.resolution})` : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-medium flex items-center gap-1.5 backdrop-blur-md shadow-sm">
                    <Check className="w-3.5 h-3.5" /> Active on New Tab
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4K Curated Gallery Grid */}
      {photos && photos.length > 0 && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-700/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Images className="w-3.5 h-3.5 text-blue-500" />
              4K Wallpaper Gallery ({photos.length} photos)
            </span>
            <span className="text-[11px] text-slate-400">
              Click any photo to set it immediately across all tabs
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
            {photos.map((p) => {
              const isActive = p.id === currentPhoto?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => selectPhoto(p.id)}
                  className={`group relative aspect-video rounded-lg overflow-hidden border text-left transition-all cursor-pointer ${
                    isActive 
                      ? 'ring-2 ring-blue-500 border-blue-500 shadow-md scale-[0.98]' 
                      : 'border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:scale-[1.02] opacity-80 hover:opacity-100'
                  }`}
                  title={`${p.title} - ${p.author}`}
                >
                  <img
                    src={p.thumbnailUrl}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-1.5">
                    <p className="text-[10px] text-white font-medium truncate">{p.title}</p>
                    <p className="text-[9px] text-white/70 truncate">{p.author}</p>
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-blue-600 text-white text-[9px] font-bold flex items-center gap-0.5 shadow">
                      <Check className="w-2.5 h-2.5" />
                      <span>Active</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const BACKGROUND_OPTIONS = [
  { id: 'default', name: 'Clean Minimalist', badge: 'Default' },
  { id: 'aurora_waves', name: 'Aurora Waves', badge: '3D Wave' },
  { id: 'cyber_grid', name: 'Cyber Grid 3D', badge: '3D Neon' },
  { id: 'hyper_space', name: 'Hyper Space Stars', badge: 'Particles' },
  { id: 'fireflies', name: 'Bioluminescent Fireflies', badge: 'Ambient' },
  { id: 'nebula', name: 'Cosmic Nebula Flow', badge: 'Galaxy' },
  { id: 'matrix', name: 'Digital Matrix Rain', badge: 'Code Rain' },
  { id: 'gradient', name: 'Dynamic Gradient', badge: 'Fluid' },
  { id: 'mesh', name: 'Mesh Aurora', badge: 'Mesh Glow' },
  { id: 'glass', name: 'Dark Glass & Prism', badge: 'Prism Glass' },
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
              animate={active ? { y: ['0px', '20px'] } : {}}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-0 left-[-50%] right-[-50%] h-[65%]"
              style={{
                backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.55) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                transform: 'rotateX(65deg) scale(1.8)',
                transformOrigin: '50% 100%',
                willChange: 'transform'
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

    case 'unsplash': {
      const activePhoto = resolveUnsplashPhoto();
      const previewUrl = activePhoto?.thumbnailUrl || activePhoto?.imageUrl || 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80';
      return (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url('${(previewUrl || '').replace(/["'\r\n\\]/g, '')}')` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        </div>
      );
    }

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
        <div 
          className="absolute inset-0 overflow-hidden transition-colors" 
          style={{ backgroundColor: 'var(--nova-frame-bg)' }}
        />
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

interface TabAnimationPreviewBoxProps {
  preset: 'chrome' | 'smooth' | 'snappy' | 'none';
  isActive: boolean;
}

const TabAnimationPreviewBox: React.FC<TabAnimationPreviewBoxProps> = React.memo(({ preset, isActive }) => {
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const cycle = (visible: boolean) => {
      if (!isMounted) return;
      setTabVisible(visible);
      timeoutId = setTimeout(() => {
        cycle(!visible);
      }, visible ? 2000 : 750);
    };

    timeoutId = setTimeout(() => cycle(false), 2000);
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTabVisible(false);
    setTimeout(() => setTabVisible(true), 100);
  };

  const animConfig = React.useMemo(() => {
    switch (preset) {
      case 'smooth':
        return {
          initial: { opacity: 0, y: 6, scale: 0.94, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6 },
          animate: { opacity: 1, y: 0, scale: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6 },
          exit: {
            opacity: 0,
            y: 4,
            scale: 0.94,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.10, ease: 'easeOut' },
              y: { duration: 0.18, ease: 'easeOut' },
              scale: { duration: 0.18, ease: 'easeOut' },
              width: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
              minWidth: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
              paddingLeft: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
              paddingRight: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
              marginRight: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }
            }
          },
          transition: {
            layout: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
            scale: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
            y: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
            opacity: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
          },
          buttonTransition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const }
        };
      case 'snappy':
        return {
          initial: { opacity: 0, y: 3, scale: 0.98, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6 },
          animate: { opacity: 1, y: 0, scale: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6 },
          exit: {
            opacity: 0,
            scale: 0.97,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.08, ease: 'easeOut' },
              scale: { duration: 0.12, ease: 'easeOut' },
              width: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              minWidth: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              paddingLeft: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              paddingRight: { duration: 0.14, ease: [0.2, 0, 0, 1] as const },
              marginRight: { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
            }
          },
          transition: {
            duration: 0.14,
            ease: [0.2, 0, 0, 1] as const,
            layout: { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
          },
          buttonTransition: { duration: 0.14, ease: [0.2, 0, 0, 1] as const }
        };
      case 'none':
        return {
          initial: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, scale: 1, y: 0 },
          animate: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, scale: 1, y: 0 },
          exit: { opacity: 0, transition: { duration: 0 } },
          transition: { duration: 0 },
          buttonTransition: { duration: 0 }
        };
      case 'chrome':
      default:
        return {
          initial: { opacity: 0, width: 0, minWidth: 0, paddingLeft: 0, paddingRight: 0, scale: 1, y: 0 },
          animate: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, scale: 1, y: 0 },
          exit: {
            opacity: 0,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.09, ease: 'easeOut' },
              width: { duration: 0.20, ease: [0.2, 0, 0, 1] as const },
              minWidth: { duration: 0.20, ease: [0.2, 0, 0, 1] as const },
              paddingLeft: { duration: 0.20, ease: [0.2, 0, 0, 1] as const },
              paddingRight: { duration: 0.20, ease: [0.2, 0, 0, 1] as const },
              marginRight: { duration: 0.20, ease: [0.2, 0, 0, 1] as const }
            }
          },
          transition: {
            duration: 0.20,
            ease: [0.2, 0, 0, 1] as const,
            layout: { duration: 0.20, ease: [0.2, 0, 0, 1] as const }
          },
          buttonTransition: { duration: 0.20, ease: [0.2, 0, 0, 1] as const }
        };
    }
  }, [preset]);

  return (
    <div 
      onMouseEnter={handleRestart}
      className="w-full h-14 rounded-xl bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-700/60 p-2 flex items-end overflow-hidden relative shadow-inner select-none"
    >
      <div className="flex items-center gap-1.5 w-full h-full">
        {/* Base Tab 1 */}
        <div className="h-7 px-2 rounded-md bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 shadow-xs flex items-center gap-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
          <div className="w-6 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600" />
        </div>

        {/* Animated Tab 2 */}
        <AnimatePresence>
          {tabVisible && (
            <motion.div
              key="preview-tab"
              initial={animConfig.initial}
              animate={animConfig.animate}
              exit={animConfig.exit}
              transition={animConfig.transition}
              className={`h-7 rounded-md flex items-center gap-1.5 shrink-0 overflow-hidden ${
                isActive 
                  ? 'bg-blue-500/20 border border-blue-500/40 text-blue-600 dark:text-blue-300 shadow-xs' 
                  : 'bg-white/90 dark:bg-slate-800/90 border border-slate-200/70 dark:border-slate-700 shadow-xs'
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 ${isActive ? 'bg-blue-500' : 'bg-slate-400 dark:bg-slate-500'}`} />
              <div className={`w-6 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-blue-500/60' : 'bg-slate-300 dark:bg-slate-600'}`} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button (+) Container */}
        <motion.div
          layout="position"
          transition={animConfig.buttonTransition}
          className="w-6 h-6 rounded-md bg-slate-200/70 dark:bg-slate-800 hover:bg-slate-300/80 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer"
          title="Replay animation"
        >
          <Plus className="w-3 h-3" />
        </motion.div>
      </div>
    </div>
  );
});

interface AppearanceSettingsProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: Partial<UserSettings>) => void;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  onUpdateSettings
}) => {
  return (
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
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
              className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer ${
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
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Tab Animation</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Select a tab opening physics preset and preview its motion</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { id: 'chrome', name: 'Chrome (Native)', desc: 'Smooth horizontal width expansion & collapse', badge: 'Default' },
            { id: 'smooth', name: 'Fluid Spring', desc: 'Soft floating lift with cushioned spring physics' },
            { id: 'snappy', name: 'Snappy', desc: 'Crisp, high-velocity responsive motion' },
            { id: 'none', name: 'Instant (No Motion)', desc: 'Immediate tab opening for maximum speed' }
          ].map(ta => {
            const isSelected = (settings.tabAnimation ?? 'chrome') === ta.id;
            return (
              <button
                key={ta.id}
                onClick={() => onUpdateSettings({ tabAnimation: ta.id as any })}
                className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start justify-between gap-3 text-left cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-900 dark:text-blue-100 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/50'
                }`}
              >
                {/* Live Animation Preview Box */}
                <TabAnimationPreviewBox preset={ta.id as any} isActive={isSelected} />

                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{ta.name}</span>
                  {ta.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20">
                      {ta.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ta.desc}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Browser Color (Full UI Theme)</h2>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                Beta
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Customize the entire browser chrome, frame, navigation bar, and tab surfaces</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[
            { id: 'default', name: 'Classic Slate', desc: 'Default Nova aesthetic', darkPreview: '#151122', lightPreview: '#f1f5f9', badge: 'Default' },
            { id: 'midnight', name: 'Midnight Navy', desc: 'Deep galactic space blue', darkPreview: '#0a0f1d', lightPreview: '#eef3f9' },
            { id: 'cyberpunk', name: 'Cyberpunk Violet', desc: 'Futuristic neon purple tone', darkPreview: '#0d071a', lightPreview: '#f7f2fe' },
            { id: 'forest', name: 'Emerald Forest', desc: 'Rich organic botanical green', darkPreview: '#04140e', lightPreview: '#f0f7f4' },
            { id: 'crimson', name: 'Crimson Ruby', desc: 'Velvet burgundy wine red', darkPreview: '#160509', lightPreview: '#fcf1f3' },
            { id: 'warm', name: 'Warm Mocha', desc: 'Cozy espresso coffee tone', darkPreview: '#140e0b', lightPreview: '#f8f4f0' },
            { id: 'ocean', name: 'Deep Ocean', desc: 'Calm abyssal teal & cyan', darkPreview: '#041217', lightPreview: '#eef7f9' },
            { id: 'sunset', name: 'Sunset Amber', desc: 'Warm dusk twilight glow', darkPreview: '#170b03', lightPreview: '#faf3ec' },
            { id: 'custom', name: 'Custom Color', desc: 'Choose your own hex color', darkPreview: settings.customBrowserColor || '#6366f1', lightPreview: settings.customBrowserColor || '#6366f1' }
          ].map(bc => {
            const isSelected = (settings.browserColor ?? 'default') === bc.id;
            return (
              <button
                key={bc.id}
                onClick={() => onUpdateSettings({ browserColor: bc.id as any })}
                className={`p-3.5 rounded-2xl border-2 transition-all flex flex-col gap-3 text-left relative overflow-hidden cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-500/10 shadow-sm'
                    : 'border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40'
                }`}
              >
                {/* Mini browser mockup preview */}
                <div 
                  className="w-full h-16 rounded-xl border border-black/10 dark:border-white/10 p-1.5 flex flex-col gap-1 overflow-hidden shadow-xs relative"
                  style={{ backgroundColor: settings.theme === 'light' ? bc.lightPreview : bc.darkPreview }}
                >
                  {/* Topbar mini header */}
                  <div className="flex items-center gap-1 w-full h-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400/80" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/80" />
                    <div className="ml-1.5 w-14 h-2.5 rounded-t bg-white/20 dark:bg-white/15" />
                  </div>
                  {/* Mini omnibox & content */}
                  <div className="flex items-center gap-1 w-full h-3 px-1 rounded bg-black/10 dark:bg-white/10">
                    <div className="w-2 h-1.5 rounded-xs bg-current opacity-30" />
                    <div className="w-12 h-1 rounded-full bg-current opacity-20" />
                  </div>
                  <div className="flex-1 rounded bg-white/40 dark:bg-black/20" />
                </div>

                <div className="flex items-center justify-between w-full">
                  <div>
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">{bc.name}</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{bc.desc}</p>
                  </div>
                  {bc.badge && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20 shrink-0">
                      {bc.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {settings.browserColor === 'custom' && (
          <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Custom Browser Color Picker:</label>
            <div className="flex items-center gap-3">
              <input 
                type="color" 
                value={settings.customBrowserColor || '#6366f1'}
                onChange={(e) => onUpdateSettings({ customBrowserColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border-none p-0 bg-transparent"
              />
              <input
                type="text"
                value={settings.customBrowserColor || '#6366f1'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^#[0-9a-fA-F]{0,8}$/.test(val)) {
                    onUpdateSettings({ customBrowserColor: val });
                  }
                }}
                className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                placeholder="#6366f1"
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              The browser automatically calculates frame, toolbar, and tab surfaces with optimal contrast.
            </span>
          </div>
        )}
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
              className={`w-12 h-12 rounded-full ${c.color} shadow-lg transition-transform hover:scale-110 flex items-center justify-center relative cursor-pointer`}
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.showBookmarksBar ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showBookmarksBar ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
          
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Vertical Tabs</span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 rounded-full">
                  Beta
                </span>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Display tabs on the left sidebar instead of the top</div>
            </div>
            <button
              onClick={() => onUpdateSettings({ useVerticalTabs: !settings.useVerticalTabs })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.useVerticalTabs ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${settings.showTasksWidget !== false ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${settings.showTasksWidget !== false ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
