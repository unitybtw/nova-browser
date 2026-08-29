import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { StampTypeCard } from './stamptype/StampTypeCard';

interface IntroSplashProps {
  onComplete?: () => void;
}

export const IntroSplash: React.FC<IntroSplashProps> = ({ onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === 'undefined') return true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    return !sessionStorage.getItem('nova_intro_dismissed');
  });

  const handleDismiss = () => {
    sessionStorage.setItem('nova_intro_dismissed', 'true');
    setIsVisible(false);
    onComplete?.();
  };

  useEffect(() => {
    if (!isVisible || prefersReducedMotion) return;

    // Auto-advance after 3.2 seconds
    const timer = setTimeout(() => {
      handleDismiss();
    }, 3200);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, prefersReducedMotion]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="intro-splash"
          initial={{ opacity: 1 }}
          exit={{
            opacity: 0,
            scale: 1.04,
            filter: 'blur(8px)',
            transition: { duration: 0.75, ease: [0.22, 1, 0.36, 1] },
          }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0d0d0f] px-4 select-none cursor-pointer"
          onClick={handleDismiss}
          role="dialog"
          aria-label="Nova Browser Manifesto Intro"
        >
          {/* Ambient Background Glow */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-[#4338ca]/20 blur-[120px]"
            aria-hidden="true"
          />

          {/* Centered Kinetic Typography Poster */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl sm:rounded-3xl border border-neutral-800 bg-[#171717] p-2 sm:p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <StampTypeCard className="aspect-[1344/620] w-full rounded-xl border-none shadow-none" />
          </motion.div>

          {/* Bottom Action / Skip Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-6 flex items-center gap-4 text-xs font-mono text-neutral-400"
          >
            <button
              onClick={handleDismiss}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-700/80 bg-neutral-900/90 px-5 py-2 text-neutral-200 shadow-sm transition hover:border-[#4338ca] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4338ca]"
            >
              <span>Enter Nova</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] text-neutral-500 hidden sm:inline">
              Click anywhere or press Esc to enter
            </span>
          </motion.div>

          {/* Timed Progress Line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-900 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 3.2, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-[#4338ca] via-[#0078bf] to-[#10b981]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroSplash;
