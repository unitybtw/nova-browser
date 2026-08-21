import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2 } from 'lucide-react';
import { Readability } from '@mozilla/readability';
import { aiAgent } from '../services/aiAgent';

interface AILinkPreviewProps {
  url: string;
  x: number;
  y: number;
  isOpen: boolean;
}

export const AILinkPreview: React.FC<AILinkPreviewProps> = ({ url, x, y, isOpen }) => {
  const [summary, setSummary] = useState<string>('');
  const [loadingText, setLoadingText] = useState<string>('');
  const [displayedSummary, setDisplayedSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typewriter effect ONLY for the final summary
  useEffect(() => {
    if (!summary || !isOpen) {
      setDisplayedSummary('');
      return;
    }
    
    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx <= summary.length) {
        setDisplayedSummary(summary.substring(0, currentIdx));
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [summary, isOpen]);

  useEffect(() => {
    if (!isOpen || !url) return;
    
    let isCancelled = false;
    
    const fetchAndSummarize = async () => {
      setIsSummarizing(true);
      setError(null);
      setSummary('');
      setLoadingText('Downloading page content...');
      
      try {
        // 1. Fetch HTML from Main Process
        const api = (window as any).electronAPI;
        if (!api?.fetchPageHtml) throw new Error("API not available");
        
        const result = await api.fetchPageHtml(url);
        if (isCancelled) return;
        
        if (!result.success || !result.html) {
          throw new Error(result.error || "Failed to fetch");
        }

        setLoadingText('Analyzing content...');

        // 2. Parse HTML directly (Main process already stripped scripts/styles for perf & safety)
        const parser = new DOMParser();
        const doc = parser.parseFromString(result.html, 'text/html');
        
        // 3. Extract readable text using Readability
        const reader = new Readability(doc);
        const article = reader.parse();
        
        let contentToSummarize = article?.textContent || doc.body.textContent || '';
        contentToSummarize = contentToSummarize.replace(/\s+/g, ' ').substring(0, 3000);
        
        if (contentToSummarize.length < 50) {
          throw new Error("Text not found");
        }

        if (isCancelled) return;

        // 4. Summarize with WebLLM (only if AI model is already loaded)
        if (!aiAgent.isReady()) {
          // If model is not loaded yet, show the page text snippet instead of triggering a massive model download
          const snippet = contentToSummarize.substring(0, 200) + '...';
          setIsSummarizing(false);
          setSummary(snippet);
          return;
        }
        
        if (isCancelled) return;
        
        setLoadingText('AI is reading...'); 

        const finalSummary = await aiAgent.summarize(contentToSummarize);
        
        if (isCancelled) return;
        
        setIsSummarizing(false);
        setSummary(finalSummary);

      } catch (err: any) {
        if (!isCancelled) {
          console.error(err);
          setError("Failed to get summary.");
        }
      } finally {
        if (!isCancelled) {
          setIsSummarizing(false);
        }
      }
    };
    
    fetchAndSummarize();
    
    return () => {
      isCancelled = true;
    };
  }, [isOpen, url]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 10 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          style={{
            position: 'fixed',
            left: Math.max(12, Math.min(x + 20, window.innerWidth - 320)),
            top: Math.max(12, Math.min(y, window.innerHeight - 180)),
            zIndex: 999999,
          }}
          className="w-72 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl rounded-2xl p-4 overflow-hidden pointer-events-none"
        >
          <div className="relative z-10 flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-white/10 pb-2">
            <div className="p-1.5 bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 rounded-lg border border-cyan-500/20">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              AI Link Preview
            </span>
          </div>
          
          <div className="relative z-10 text-xs text-slate-700 dark:text-slate-300 min-h-[40px] leading-relaxed">
            {isSummarizing && !error ? (
              <div className="flex flex-col items-center justify-center h-[50px] text-slate-500 dark:text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                <span className="text-[11px] font-medium text-center">{loadingText}</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-xs text-center py-2 font-medium">{error}</div>
            ) : (
              <p>
                {displayedSummary}
                {displayedSummary.length < summary.length && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    className="inline-block w-[2px] h-[12px] bg-cyan-500 ml-[2px] align-middle rounded-full"
                  />
                )}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
