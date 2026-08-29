import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { StampTypeCard } from './stamptype/StampTypeCard';

export const ManifestoHero: React.FC = () => {
  const prefersReducedMotion = useReducedMotion();

  const handleScrollDown = () => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      id="manifesto"
      className="relative h-screen w-full overflow-hidden bg-[#171717]"
    >
      {/* Full-bleed Edge-to-Edge Kinetic Typography Canvas */}
      <div className="absolute inset-0 h-full w-full">
        <StampTypeCard className="h-full w-full" />
      </div>

      {/* Floating Animated Scroll Down Arrow Only */}
      <motion.button
        type="button"
        onClick={handleScrollDown}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 15 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="group absolute bottom-8 left-1/2 z-20 -translate-x-1/2 cursor-pointer p-3 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-full bg-black/40 backdrop-blur-md border border-white/20 hover:border-white/60 hover:bg-black/60 transition-all shadow-lg"
        aria-label="Scroll down to main content"
      >
        <motion.div
          animate={
            prefersReducedMotion
              ? undefined
              : { y: [0, 6, 0] }
          }
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <ChevronDown className="h-5 w-5 text-white transition-transform group-hover:translate-y-0.5" />
        </motion.div>
      </motion.button>
    </section>
  );
};

export default ManifestoHero;
