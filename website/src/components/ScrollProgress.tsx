import React from 'react';
import { motion, useReducedMotion, useScroll, useSpring } from 'framer-motion';

export const ScrollProgress: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const prefersReducedMotion = useReducedMotion();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.2,
  });
  const progress = prefersReducedMotion ? scrollYProgress : smoothProgress;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-1" aria-hidden="true">
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-[#4338ca] via-indigo-500 to-cyan-400 shadow-[0_0_18px_rgba(79,70,229,0.65)]"
        style={{ scaleX: progress }}
      />
    </div>
  );
};

export default ScrollProgress;
