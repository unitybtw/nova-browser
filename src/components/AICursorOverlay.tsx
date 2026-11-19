import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Keyboard } from 'lucide-react';
import { generateId } from '../utils/idGenerator';

export interface AICursorEvent {
  x: number;
  y: number;
  action: 'move' | 'click' | 'type';
  text?: string;
}

export const AICursorOverlay: React.FC = () => {
  const [cursor, setCursor] = useState<AICursorEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [ripples, setRipples] = useState<{id: string, x: number, y: number}[]>([]);

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;
    const rippleTimers = new Set<NodeJS.Timeout>();

    const handleAICursor = (e: Event) => {
      const customEvent = e as CustomEvent<AICursorEvent>;
      setCursor(customEvent.detail);
      setIsVisible(true);

      if (customEvent.detail.action === 'click') {
        const id = generateId('ripple');
        setRipples(prev => [...prev, { id, x: customEvent.detail.x, y: customEvent.detail.y }]);
        const rippleTimer = setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
          rippleTimers.delete(rippleTimer);
        }, 1000);
        rippleTimers.add(rippleTimer);
      }

      clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Hide after 3 seconds of inactivity
    };

    window.addEventListener('ai-cursor', handleAICursor);
    return () => {
      window.removeEventListener('ai-cursor', handleAICursor);
      clearTimeout(hideTimeout);
      rippleTimers.forEach(t => clearTimeout(t));
      rippleTimers.clear();
    };
  }, []);

  if (!cursor) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999]">
      {/* Click Ripples */}
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.div
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{ left: ripple.x, top: ripple.y }}
            className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border border-neutral-900/50 dark:border-white/50"
          />
        ))}
      </AnimatePresence>

      {/* The AI Cursor */}
      <motion.div
        animate={{ x: cursor.x, y: cursor.y }}
        transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
        className="absolute top-0 left-0 flex items-start gap-2"
        style={{ opacity: isVisible ? 1 : 0 }}
      >
        <div className="relative">
          {cursor.action === 'type' ? (
            <motion.div
              initial={{ scale: 0.85 }}
              animate={{ scale: 1 }}
              className="bg-neutral-950 text-white border border-white/20 rounded-full p-1.5 shadow-md"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </motion.div>
          ) : (
            <motion.div
              animate={{ scale: cursor.action === 'click' ? 0.85 : 1 }}
              className="filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
            >
              <MousePointer2 className="w-6 h-6 fill-neutral-950 text-white" />
            </motion.div>
          )}

          <div className="absolute top-full left-full mt-1 ml-1 bg-neutral-950/95 text-white border border-white/15 text-[10px] font-medium px-2 py-0.5 rounded-md whitespace-nowrap shadow-md flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
            Nova Agent
          </div>
        </div>
      </motion.div>
    </div>
  );
};
