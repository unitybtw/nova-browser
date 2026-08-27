import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Loader2, Globe, Clock, ExternalLink } from 'lucide-react';
import { Readability } from '@mozilla/readability';
import { aiAgent } from '../services/aiAgent';

interface AILinkPreviewProps {
  url: string;
  x: number;
  y: number;
  isOpen: boolean;
}

interface PreviewData {
  title: string;
  domain: string;
  summary: string;
  readingTimeMinutes: number;
  ogImage?: string;
  isAiGenerated: boolean;
}

// In-Memory LRU Cache for Instant Previews
const previewCache = new Map<string, PreviewData>();

// Helper to extract clean, complete sentences from text
function extractCompleteSentences(text: string, maxChars = 280): string {
  if (!text) return '';
  // Clean unwanted boilerplate & whitespace
  let clean = text
    .replace(/cookie policy|çerez politikası|tüm hakları saklıdır|all rights reserved|sign in|giriş yap|privacy policy|gizlilik politikası/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Split by sentence terminators (. ! ?)
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  
  for (const s of sentences) {
    const trimmed = s.trim();
    if (!trimmed || trimmed.length < 15) continue;
    // Don't add menu-like short fragments
    if (/^(menü|menu|home|anasayfa|ara|search|paylaş|share|yazar|author)/i.test(trimmed)) continue;
    
    if ((result + ' ' + trimmed).length > maxChars && result.length > 50) {
      break;
    }
    result = result ? `${result} ${trimmed}` : trimmed;
    if (result.length >= maxChars) break;
  }

  // Fallback if regex split didn't find clear periods
  if (!result || result.length < 40) {
    result = clean.substring(0, maxChars);
    const lastSpace = result.lastIndexOf(' ');
    if (lastSpace > 40) {
      result = result.substring(0, lastSpace) + '.';
    } else {
      result = result + '.';
    }
  }

  // Ensure trailing period
  if (!/[.!?]$/.test(result.trim())) {
    result = result.trim() + '.';
  }

  return result;
}

export const AILinkPreview: React.FC<AILinkPreviewProps> = ({ url, x, y, isOpen }) => {
  const [data, setData] = useState<PreviewData | null>(null);
  const [loadingText, setLoadingText] = useState<string>('');
  const [displayedSummary, setDisplayedSummary] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Typewriter effect for clean reading
  useEffect(() => {
    if (!data?.summary || !isOpen) {
      setDisplayedSummary('');
      return;
    }

    // If loaded from cache, show immediately without waiting for typewriter
    if (previewCache.has(url)) {
      setDisplayedSummary(data.summary);
      return;
    }
    
    let currentIdx = 0;
    const targetText = data.summary;
    const step = Math.max(1, Math.ceil(targetText.length / 40)); // Dynamic speed based on length
    
    const interval = setInterval(() => {
      currentIdx += step;
      if (currentIdx <= targetText.length) {
        setDisplayedSummary(targetText.substring(0, currentIdx));
      } else {
        setDisplayedSummary(targetText);
        clearInterval(interval);
      }
    }, 15);
    
    return () => clearInterval(interval);
  }, [data?.summary, isOpen, url]);

  useEffect(() => {
    if (!isOpen || !url) return;
    
    // Check cache first
    if (previewCache.has(url)) {
      const cached = previewCache.get(url)!;
      setData(cached);
      setDisplayedSummary(cached.summary);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isCancelled = false;
    
    const fetchAndSummarize = async () => {
      setIsLoading(true);
      setError(null);
      setData(null);
      setDisplayedSummary('');
      setLoadingText('Fetching page content...');
      
      try {
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          domain = url;
        }
        const api = (window as any).electronAPI;
        if (!api?.fetchPageHtml) throw new Error("API not available");
        
        const result = await api.fetchPageHtml(url);
        if (isCancelled) return;
        
        if (!result.success || !result.html) {
          throw new Error(result.error || "Failed to load content");
        }

        setLoadingText('Analyzing content...');

        const parser = new DOMParser();
        const doc = parser.parseFromString(result.html, 'text/html');
        
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

        let pageTitle = ogTitle || doc.title || domain;
        let cleanText = '';
        try {
          const reader = new Readability(doc);
          const article = reader.parse();
          if (article?.title) pageTitle = article.title;
          cleanText = article?.textContent || '';
        } catch (e) {
          cleanText = doc.body.textContent || '';
        }
        
        cleanText = cleanText.replace(/\s+/g, ' ').trim();
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
        const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

        let finalSummary = '';
        let isAiGenerated = false;

        if (aiAgent.isReady() && cleanText.length > 80) {
          setLoadingText('AI is summarizing...');
          try {
            const aiSummary = await aiAgent.summarize(cleanText.substring(0, 3000), pageTitle);
            if (aiSummary && aiSummary.length > 25) {
              finalSummary = aiSummary;
              isAiGenerated = true;
            }
          } catch (e) {
            console.warn('AI summary failed, using smart extraction:', e);
          }
        }

        if (!finalSummary) {
          const descriptionCandidate = (ogDesc || metaDesc || '').trim();
          if (descriptionCandidate.length > 30) {
            finalSummary = descriptionCandidate;
          } else if (cleanText.length > 40) {
            const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [];
            if (sentences.length > 0) {
              finalSummary = sentences.slice(0, 2).join(' ').trim();
            } else {
              finalSummary = cleanText.substring(0, 180).trim() + '...';
            }
          } else {
            finalSummary = 'Preview available. Click to visit this page.';
          }
        }

        if (isCancelled) return;

        const previewResult: PreviewData = {
          title: pageTitle,
          domain,
          summary: finalSummary,
          ogImage: ogImage || undefined,
          readingTimeMinutes,
          isAiGenerated
        };
        previewCache.set(url, previewResult);
        setData(previewResult);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to preview link:', err);
          setError('Preview unavailable for this page');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAndSummarize();
    return () => { isCancelled = true; };
  }, [url, isOpen]);

  useEffect(() => {
    if (!data?.summary) {
      setDisplayedSummary('');
      return;
    }

    if (!data.isAiGenerated) {
      setDisplayedSummary(data.summary);
      return;
    }

    let i = 0;
    setDisplayedSummary('');
    const fullText = data.summary;
    const timer = setInterval(() => {
      i += 3;
      if (i >= fullText.length) {
        setDisplayedSummary(fullText);
        clearInterval(timer);
      } else {
        setDisplayedSummary(fullText.substring(0, i));
      }
    }, 15);

    return () => clearInterval(timer);
  }, [data]);

  let domainName = '';
  try {
    domainName = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    domainName = url;
  }

  const topPos = typeof window !== 'undefined' ? Math.min(window.innerHeight - 260, Math.max(10, y + 16)) : y;
  const leftPos = typeof window !== 'undefined' ? Math.min(window.innerWidth - 340, Math.max(10, x + 16)) : x;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 6 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          style={{ top: topPos, left: leftPos, position: 'fixed', zIndex: 999999 }}
          className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 shadow-2xl pointer-events-none"
        >
          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-1.5 min-w-0">
              <Globe className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
              <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                {domainName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {data && (
                <span className="flex items-center gap-1 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  ~{data.readingTimeMinutes} min
                </span>
              )}
              <span className="p-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
                <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>

          {data?.title && (
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-2">
              {data.title}
            </h4>
          )}

          <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed min-h-[46px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-4 text-slate-500 dark:text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                <span className="text-[11px] font-medium">{loadingText}</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-xs text-center py-3 font-medium bg-red-500/5 rounded-xl border border-red-500/10">
                {error}
              </div>
            ) : (
              <p>{displayedSummary}</p>
            )}
          </div>

          {data && !isLoading && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1 font-medium text-cyan-600 dark:text-cyan-400">
                <Sparkles className="w-2.5 h-2.5" />
                {data.isAiGenerated ? 'AI Summary' : 'Smart Page Preview'}
              </span>
              <span className="flex items-center gap-1 opacity-80">
                Click to open <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
