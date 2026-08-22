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
      setLoadingText('Sayfa içeriği alınıyor...');
      
      try {
        let domain = '';
        try {
          domain = new URL(url).hostname.replace(/^www\./, '');
        } catch {
          domain = url;
        }

        // 1. Fetch HTML from Main Process
        const api = (window as any).electronAPI;
        if (!api?.fetchPageHtml) throw new Error("API not available");
        
        const result = await api.fetchPageHtml(url);
        if (isCancelled) return;
        
        if (!result.success || !result.html) {
          throw new Error(result.error || "İçerik yüklenemedi");
        }

        setLoadingText('İçerik analiz ediliyor...');

        // 2. Parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(result.html, 'text/html');
        
        // 3. Extract Metadata
        const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute('content');
        const ogImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content');

        // 4. Extract readable article text using Mozilla Readability
        let pageTitle = ogTitle || doc.title || domain;
        let articleText = '';
        try {
          const reader = new Readability(doc);
          const article = reader.parse();
          if (article?.title) pageTitle = article.title;
          articleText = article?.textContent || '';
        } catch (e) {
          articleText = doc.body.textContent || '';
        }
        
        // Clean text
        let cleanText = (articleText || doc.body.textContent || '')
          .replace(/\s+/g, ' ')
          .trim();
        
        const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
        const readingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

        let finalSummary = '';
        let isAiGenerated = false;

        // 5. Intelligent Summarization
        if (aiAgent.isReady() && cleanText.length > 80) {
          setLoadingText('Yapay zeka özetliyor...');
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

        // Fallback to rich meta description or smart complete sentence extraction
        if (!finalSummary) {
          const descriptionCandidate = (ogDesc || metaDesc || '').trim();
          if (descriptionCandidate.length > 40) {
            finalSummary = extractCompleteSentences(descriptionCandidate, 260);
          } else {
            finalSummary = extractCompleteSentences(cleanText, 260);
          }
        }

        if (!finalSummary || finalSummary.length < 20) {
          finalSummary = `${domain} üzerindeki bu sayfa konuyla ilgili detaylı bilgiler içermektedir.`;
        }

        if (isCancelled) return;

        const previewResult: PreviewData = {
          title: pageTitle.trim(),
          domain,
          summary: finalSummary,
          readingTimeMinutes,
          ogImage: ogImage?.startsWith('http') ? ogImage : undefined,
          isAiGenerated
        };

        // Cache result
        previewCache.set(url, previewResult);
        setData(previewResult);
        setIsLoading(false);

      } catch (err: any) {
        if (!isCancelled) {
          console.error('[AILinkPreview] Error:', err);
          setError("Sayfa önizlemesi oluşturulamadı.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };
    
    fetchAndSummarize();
    
    return () => {
      isCancelled = true;
    };
  }, [isOpen, url]);

  let domainName = '';
  try {
    domainName = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    domainName = url;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          style={{
            position: 'fixed',
            left: Math.max(16, Math.min(x + 20, window.innerWidth - 380)),
            top: Math.max(16, Math.min(y - 30, window.innerHeight - 240)),
            zIndex: 999999,
          }}
          className="w-88 md:w-92 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-2xl rounded-2xl p-4 overflow-hidden pointer-events-none select-none cursor-default"
        >
          {/* Top Bar: Favicon + Domain + Reading Time */}
          <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 min-w-0">
              <img 
                src={`https://www.google.com/s2/favicons?domain=${domainName}&sz=32`} 
                alt="" 
                className="w-4 h-4 rounded-sm shrink-0 object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
              <span className="text-[11.5px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                {domainName}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {data && (
                <span className="flex items-center gap-1 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" />
                  ~{data.readingTimeMinutes} dk
                </span>
              )}
              <span className="p-1 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 rounded-lg">
                <Sparkles className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Title */}
          {data?.title && (
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-2">
              {data.title}
            </h4>
          )}

          {/* Content Area */}
          <div className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed min-h-[46px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-4 text-slate-500 dark:text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                <span className="text-[11px] font-medium text-center">{loadingText}</span>
              </div>
            ) : error ? (
              <div className="text-red-500 text-xs text-center py-3 font-medium bg-red-500/5 rounded-xl border border-red-500/10">
                {error}
              </div>
            ) : (
              <div className="relative">
                <p className="inline font-normal">
                  {displayedSummary}
                </p>
                {displayedSummary.length < (data?.summary.length || 0) && (
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
                    className="inline-block w-[2px] h-[13px] bg-cyan-500 ml-[2px] align-middle rounded-full"
                  />
                )}
              </div>
            )}
          </div>

          {/* Footer Badge */}
          {data && !isLoading && (
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10.5px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1 font-medium text-cyan-600 dark:text-cyan-400">
                <Sparkles className="w-2.5 h-2.5" />
                {data.isAiGenerated ? 'Yapay Zeka Özeti' : 'Akıllı Sayfa Önizlemesi'}
              </span>
              <span className="flex items-center gap-1 opacity-80">
                Açmak için tıklayın <ExternalLink className="w-2.5 h-2.5" />
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
