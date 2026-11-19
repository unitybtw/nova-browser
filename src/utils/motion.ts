/**
 * Shared motion language for the browser chrome.
 * Short, decelerating tweens (Linear / macOS feel). Springs are reserved for layout moves.
 * Reduced motion is handled globally by <MotionConfig reducedMotion> in App.tsx.
 */
import type { Transition, Variants } from 'framer-motion';

export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_IN_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1];

export const DURATION = {
  instant: 0.08,
  fast: 0.14,
  base: 0.2,
  slow: 0.32,
} as const;

export const tFast: Transition = { duration: DURATION.fast, ease: EASE_OUT };
export const tBase: Transition = { duration: DURATION.base, ease: EASE_OUT };
export const tSlow: Transition = { duration: DURATION.slow, ease: EASE_OUT };
export const tLayout: Transition = { type: 'spring', stiffness: 420, damping: 34, mass: 0.7 };

/** Dim layer behind modals. */
export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: tFast },
  exit: { opacity: 0, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } },
};

/** Centered dialogs. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: tBase },
  exit: { opacity: 0, scale: 0.98, y: 4, transition: { duration: DURATION.fast, ease: EASE_IN_OUT } },
};

/** Anchored popovers / menus. */
export const popoverVariants: Variants = {
  hidden: { opacity: 0, scale: 0.97, y: -4 },
  visible: { opacity: 1, scale: 1, y: 0, transition: tFast },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DURATION.instant + 0.02, ease: EASE_IN_OUT } },
};

/** Content that swaps in place (settings tabs, pages). */
export const contentVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: tBase },
};

/** Staggered lists. */
export const listContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};
export const listItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: tBase },
};
