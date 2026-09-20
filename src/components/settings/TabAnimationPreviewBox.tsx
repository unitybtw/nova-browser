import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';

export interface TabAnimationPreviewBoxProps {
  preset: 'chrome' | 'smooth' | 'snappy' | 'none';
  isActive: boolean;
}

export const TabAnimationPreviewBox: React.FC<TabAnimationPreviewBoxProps> = React.memo(({ preset, isActive }) => {
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
