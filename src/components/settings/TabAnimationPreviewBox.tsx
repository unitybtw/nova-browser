import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

export interface TabAnimationPreviewBoxProps {
  preset: 'chrome' | 'smooth' | 'snappy' | 'none';
  isActive: boolean;
}

export const TabAnimationPreviewBox: React.FC<TabAnimationPreviewBoxProps> = React.memo(({ preset, isActive }) => {
  const [tabVisible, setTabVisible] = useState(true);

  const restartTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

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
      if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    };
  }, []);

  const handleRestart = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTabVisible(false);
    if (restartTimeoutRef.current) clearTimeout(restartTimeoutRef.current);
    restartTimeoutRef.current = setTimeout(() => setTabVisible(true), 100);
  };

  const animConfig = React.useMemo(() => {
    switch (preset) {
      case 'smooth':
        return {
          initial: { opacity: 0, y: 4, scale: 0.96, width: 0, minWidth: 0, paddingLeft: 0, paddingRight: 0, marginRight: -4 },
          animate: { opacity: 1, y: 0, scale: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, marginRight: 0 },
          exit: {
            opacity: 0,
            y: 4,
            scale: 0.96,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.08, ease: 'easeOut' },
              y: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
              scale: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
              width: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              minWidth: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              paddingLeft: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              paddingRight: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const },
              marginRight: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
            }
          },
          transition: {
            duration: 0.20,
            ease: [0.16, 1, 0.3, 1] as const,
            layout: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
          },
          buttonTransition: { duration: 0.20, ease: [0.16, 1, 0.3, 1] as const }
        };
      case 'snappy':
        return {
          initial: { opacity: 0, y: 2, scale: 0.98, width: 0, minWidth: 0, paddingLeft: 0, paddingRight: 0, marginRight: -4 },
          animate: { opacity: 1, y: 0, scale: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, marginRight: 0 },
          exit: {
            opacity: 0,
            scale: 0.98,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            transition: {
              opacity: { duration: 0.06, ease: 'easeOut' },
              scale: { duration: 0.12, ease: [0.2, 0, 0, 1] as const },
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
          initial: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, scale: 1, y: 0, marginRight: 0 },
          animate: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, scale: 1, y: 0, marginRight: 0 },
          exit: { opacity: 0, transition: { duration: 0 } },
          transition: { duration: 0 },
          buttonTransition: { duration: 0 }
        };
      case 'chrome':
      default:
        return {
          initial: { opacity: 0, width: 0, minWidth: 0, paddingLeft: 0, paddingRight: 0, marginRight: -4, scale: 1, y: 0 },
          animate: { opacity: 1, width: 56, minWidth: 56, paddingLeft: 6, paddingRight: 6, marginRight: 0, scale: 1, y: 0 },
          exit: {
            opacity: 0,
            width: 0,
            minWidth: 0,
            paddingLeft: 0,
            paddingRight: 0,
            marginRight: -4,
            scale: 1,
            y: 0,
            transition: {
              opacity: { duration: 0.08, ease: 'easeOut' },
              width: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              minWidth: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              paddingLeft: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              paddingRight: { duration: 0.18, ease: [0.2, 0, 0, 1] as const },
              marginRight: { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
            }
          },
          transition: {
            duration: 0.18,
            ease: [0.2, 0, 0, 1] as const,
            layout: { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
          },
          buttonTransition: { duration: 0.18, ease: [0.2, 0, 0, 1] as const }
        };
    }
  }, [preset]);

  return (
    <div
      onMouseEnter={handleRestart}
      className="w-full h-12 rounded-lg bg-neutral-100/90 dark:bg-white/[0.04] border border-neutral-200/80 dark:border-white/[0.08] p-1.5 flex items-end overflow-hidden relative select-none"
    >
      <div className="flex items-center gap-1.5 w-full h-full">
        {/* Base Tab 1 */}
        <div className="h-6 px-2 rounded-md bg-white dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08] flex items-center gap-1.5 shrink-0">
          <div className="w-2 h-2 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
          <div className="w-6 h-1.5 rounded-full bg-neutral-300 dark:bg-white/15" />
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
              className={`h-6 rounded-md flex items-center gap-1.5 shrink-0 overflow-hidden ${
                isActive
                  ? 'bg-neutral-900 dark:bg-white border border-transparent text-white dark:text-neutral-950'
                  : 'bg-white dark:bg-white/[0.07] border border-neutral-200/80 dark:border-white/[0.08]'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isActive ? 'bg-white/80 dark:bg-neutral-900/80' : 'bg-neutral-400 dark:bg-neutral-500'
                }`}
              />
              <div
                className={`w-6 h-1.5 rounded-full shrink-0 ${
                  isActive ? 'bg-white/50 dark:bg-neutral-900/50' : 'bg-neutral-300 dark:bg-white/15'
                }`}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button (+) Container */}
        <motion.div
          layout="position"
          transition={animConfig.buttonTransition}
          className="w-6 h-6 rounded-md bg-neutral-200/80 dark:bg-white/[0.07] hover:bg-neutral-300/80 dark:hover:bg-white/[0.12] flex items-center justify-center text-neutral-500 dark:text-neutral-400 shrink-0 cursor-pointer"
          title="Replay animation"
        >
          <Plus className="w-3 h-3" />
        </motion.div>
      </div>
    </div>
  );
});
