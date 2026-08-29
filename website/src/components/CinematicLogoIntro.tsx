import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface CinematicLogoIntroProps {
  onComplete?: () => void;
}

export const CinematicLogoIntro: React.FC<CinematicLogoIntroProps> = ({ onComplete }) => {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<'laser' | 'reveal' | 'warp' | 'done'>('laser');

  useEffect(() => {
    if (prefersReducedMotion) {
      setStage('done');
      onComplete?.();
      return;
    }

    // Sequence timing
    // 0ms - 400ms: Laser horizon flare
    // 400ms - 1700ms: Logo materialization & spectral prism rays
    // 1700ms - 2200ms: Warp zoom punch & dissolve
    // 2200ms: Finish and unmount
    const t1 = setTimeout(() => setStage('reveal'), 350);
    const t2 = setTimeout(() => setStage('warp'), 1750);
    const t3 = setTimeout(() => {
      setStage('done');
      onComplete?.();
    }, 2250);

    const handleSkip = () => {
      setStage('done');
      onComplete?.();
    };

    window.addEventListener('keydown', handleSkip, { once: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener('keydown', handleSkip);
    };
  }, [onComplete, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="nova-cinematic-intro"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#07080c] overflow-hidden select-none cursor-pointer"
          onClick={() => {
            setStage('done');
            onComplete?.();
          }}
          aria-label="Nova Browser Intro"
          role="dialog"
          aria-modal="true"
        >
          {/* Deep Ambient Background Glow */}
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(67,56,202,0.18),rgba(6,182,212,0.06)_45%,transparent_75%)]"
            aria-hidden="true"
          />

          {/* Phase 1 & 2: Horizontal Quantum Laser Horizon Line */}
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={
              stage === 'laser'
                ? { scaleX: [0, 1.2, 1], opacity: [0, 1, 0.8], transition: { duration: 0.45, ease: 'easeOut' } }
                : stage === 'reveal'
                ? { scaleX: 1, opacity: 0.3, transition: { duration: 0.6 } }
                : { scaleX: 2, opacity: 0, transition: { duration: 0.3 } }
            }
            className="pointer-events-none absolute h-[1.5px] w-full max-w-4xl bg-gradient-to-r from-transparent via-cyan-400 via-indigo-500 to-transparent shadow-[0_0_24px_#38bdf8]"
            aria-hidden="true"
          />

          {/* Phase 2: Vertical Spectral Prisms (Netflix-Style Color Ribbons) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70" aria-hidden="true">
            {[-120, -70, -25, 0, 25, 70, 120].map((offset, i) => (
              <motion.div
                key={i}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={
                  stage === 'reveal'
                    ? {
                        scaleY: [0, 1.4, 1],
                        opacity: [0, 0.65, 0.25],
                        transition: {
                          duration: 0.8,
                          delay: 0.05 * i,
                          ease: [0.16, 1, 0.3, 1],
                        },
                      }
                    : stage === 'warp'
                    ? {
                        scaleY: 2.5,
                        opacity: 0,
                        transition: { duration: 0.4 },
                      }
                    : { scaleY: 0, opacity: 0 }
                }
                className="absolute w-[2px] h-[600px] origin-center blur-[1px]"
                style={{
                  left: `calc(50% + ${offset}px)`,
                  background:
                    i % 3 === 0
                      ? 'linear-gradient(180deg, transparent, #38bdf8, transparent)'
                      : i % 3 === 1
                      ? 'linear-gradient(180deg, transparent, #6366f1, transparent)'
                      : 'linear-gradient(180deg, transparent, #a855f7, transparent)',
                }}
              />
            ))}
          </div>

          {/* Phase 2 & 3: Logo & Typography Reveal */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, filter: 'blur(12px)' }}
            animate={
              stage === 'laser'
                ? { scale: 0.7, opacity: 0, filter: 'blur(12px)' }
                : stage === 'reveal'
                ? {
                    scale: [0.8, 1.04, 1],
                    opacity: 1,
                    filter: 'blur(0px)',
                    transition: { duration: 0.9, ease: [0.16, 1, 0.3, 1] },
                  }
                : {
                    scale: 3.2,
                    opacity: 0,
                    filter: 'blur(18px)',
                    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
                  }
            }
            className="relative flex flex-col items-center justify-center z-10"
          >
            {/* Pulsing Backlight Halo */}
            <div className="absolute -inset-10 rounded-full bg-gradient-to-tr from-indigo-600/40 via-cyan-500/30 to-purple-600/30 blur-2xl animate-pulse" />

            {/* Nova Sovereign Logo Icon */}
            <div className="relative mb-5 flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-3xl bg-[#0c0d14] p-3 border border-white/20 shadow-[0_0_50px_rgba(99,102,241,0.6)]">
              <img
                src="/nova-logo-tight.png"
                alt="Nova Logo"
                className="h-full w-full object-contain drop-shadow-[0_0_20px_rgba(56,189,248,0.8)]"
              />
            </div>

            {/* Cinematic Brand Monogram */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={
                stage === 'reveal'
                  ? { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
                  : { opacity: 0, y: 30, transition: { duration: 0.3 } }
              }
              className="text-center"
            >
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-[0.35em] text-white drop-shadow-[0_0_25px_rgba(99,102,241,0.9)]">
                NOVA
              </h1>
              <p className="font-mono text-[10px] sm:text-xs font-semibold uppercase tracking-[0.3em] text-cyan-400/90 mt-1">
                Sovereign Architecture
              </p>
            </motion.div>
          </motion.div>

          {/* Discreet Skip Button Hint */}
          <div className="absolute bottom-6 sm:bottom-8 right-6 sm:right-8 z-20">
            <span className="font-mono text-[11px] uppercase tracking-widest text-neutral-400/80 bg-white/5 border border-white/10 px-3 py-1 rounded-full hover:bg-white/10 transition-colors">
              Click or press any key to skip
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CinematicLogoIntro;
