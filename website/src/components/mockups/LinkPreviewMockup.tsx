import { motion, AnimatePresence } from 'framer-motion';
import { MousePointer2, Sparkles } from 'lucide-react';
import { BrowserWindow } from './BrowserWindow';
import { useState, useEffect, useRef } from 'react';

export const LinkPreviewMockup = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset state for loop
    const runAnimation = () => {
      setIsHovered(false);
      setShowTooltip(false);
      
      setTimeout(() => setIsHovered(true), 1500); // cursor reaches link
      setTimeout(() => setShowTooltip(true), 3000); // 1.5s after hover
    };

    runAnimation();
    const interval = setInterval(runAnimation, 8000); // loop every 8s

    return () => clearInterval(interval);
  }, []);

  return (
    <BrowserWindow url="techblog.io/future-of-ai">
      <div ref={containerRef} className="flex flex-col h-full bg-background p-6 relative overflow-hidden">
        
        {/* Article Fake Content */}
        <div className="max-w-sm mx-auto w-full pt-4">
           <div className="h-6 w-3/4 bg-muted rounded-full mb-6" />
           <div className="space-y-3">
              <div className="h-3 w-full bg-muted/50 rounded-full" />
              <div className="h-3 w-5/6 bg-muted/50 rounded-full" />
              <div className="h-3 w-full bg-muted/50 rounded-full" />
              <div className="h-3 w-4/6 bg-muted/50 rounded-full" />
              
              <div className="pt-3 pb-2 text-foreground/80 leading-relaxed text-sm">
                 As we move forward, the most impactful changes will come from 
                 {' '}
                 <span className="relative inline-block z-20">
                    <span className={`text-blue-500 font-medium decoration-blue-500/30 underline-offset-4 transition-all duration-300 ${isHovered ? 'underline bg-blue-500/10 px-1 rounded-sm' : ''}`}>
                       predictive user interfaces
                    </span>
                    
                    {/* Tooltip Popup */}
                    <AnimatePresence>
                      {showTooltip && (
                         <motion.div 
                           initial={{ opacity: 0, y: 10, scale: 0.95 }}
                           animate={{ opacity: 1, y: 0, scale: 1 }}
                           exit={{ opacity: 0, y: 5, scale: 0.95 }}
                           transition={{ type: "spring", stiffness: 200, damping: 20 }}
                           className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-background/95 backdrop-blur-xl border border-border shadow-2xl rounded-xl p-4 z-50 pointer-events-none"
                         >
                            <div className="flex items-center gap-2 mb-2 text-purple-500 font-bold text-[10px] uppercase tracking-widest">
                               <Sparkles className="w-3.5 h-3.5" /> AI Summary
                            </div>
                            <div className="text-xs text-foreground/70 leading-relaxed">
                               <motion.span
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 transition={{ duration: 1.5, ease: "linear" }}
                               >
                                  Interfaces that anticipate user needs before interaction, reducing cognitive load and saving time.
                               </motion.span>
                               <span className="inline-block w-1 h-3 bg-purple-500 animate-pulse ml-1 align-middle" />
                            </div>
                         </motion.div>
                      )}
                    </AnimatePresence>
                 </span>
                 {' '}
                 that adapt to your needs instantly.
              </div>
              
              <div className="h-3 w-full bg-muted/50 rounded-full" />
              <div className="h-3 w-2/3 bg-muted/50 rounded-full" />
           </div>
        </div>

        {/* Fake Cursor */}
        <motion.div 
           initial={{ top: "80%", left: "80%" }}
           animate={{ top: "43%", left: "37%" }}
           transition={{ duration: 1.5, ease: "circOut", repeat: Infinity, repeatType: "loop", repeatDelay: 6.5 }}
           className="absolute z-40 pointer-events-none"
        >
           <MousePointer2 className={`w-5 h-5 text-foreground drop-shadow-md transition-transform duration-200 ${isHovered ? 'scale-90' : ''}`} fill="currentColor" />
        </motion.div>
        
      </div>
    </BrowserWindow>
  );
};
