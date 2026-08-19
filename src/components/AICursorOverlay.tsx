import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Keyboard } from 'lucide-react';

export interface AICursorEvent {
  x: number;
  y: number;
  action: 'move' | 'click' | 'type';
  text?: string;
}

export const AICursorOverlay: React.FC = () => {
  const [cursor, setCursor] = useState<AICursorEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);

  useEffect(() => {
    let hideTimeout: NodeJS.Timeout;

    const handleAICursor = (e: Event) => {
      const customEvent = e as CustomEvent<AICursorEvent>;
      setCursor(customEvent.detail);
      setIsVisible(true);

      if (customEvent.detail.action === 'click') {
        const id = Date.now();
        setRipples(prev => [...prev, { id, x: customEvent.detail.x, y: customEvent.detail.y }]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 1000);
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
            className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-cyan-400"
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
              initial={{ scale: 0.8 }} 
              animate={{ scale: 1 }} 
              className="bg-cyan-500 rounded-full p-1.5 shadow-lg shadow-cyan-500/40 text-slate-950"
            >
              <Keyboard className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div 
              animate={{ scale: cursor.action === 'click' ? 0.8 : 1 }}
              className="text-cyan-400 filter drop-shadow-[0_4px_10px_rgba(6,182,212,0.6)]"
            >
              <MousePointer2 className="w-7 h-7 fill-cyan-400 text-cyan-200" />
            </motion.div>
          )}
          
          <div className="absolute top-full left-full mt-1 ml-1 bg-cyan-500 text-slate-950 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-slate-950 rounded-full animate-pulse" />
            AI Agent
          </div>
        </div>
      </motion.div>
    </div>
  );
};
