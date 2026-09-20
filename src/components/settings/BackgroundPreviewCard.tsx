import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import { resolveUnsplashPhoto } from '../../utils/unsplash';

export const BACKGROUND_OPTIONS = [
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

export const renderBackgroundAnimation = (id: string, isHovered: boolean, isSelected: boolean) => {
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

export const BackgroundPreviewCard: React.FC<{
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
