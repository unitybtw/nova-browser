import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Type, Sun, Moon, ArrowLeft, ShieldAlert, Play, Pause, Square, FastForward } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Readability } from '@mozilla/readability';

interface ReaderModeProps {
  url: string;
  tabId: string;
  isActive: boolean;
  onClose: () => void;
}

export const ReaderMode: React.FC<ReaderModeProps> = ({ url, tabId, isActive, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [font, setFont] = useState<'serif' | 'sans'>('sans');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [showControls, setShowControls] = useState(false);

  // TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const contentRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Cleanup speech when reader is closed or component unmounts
    if (!isActive) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isActive]);

  const toggleSpeech = () => {
    if (window.speechSynthesis.speaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
        setIsPlaying(true);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
        setIsPlaying(false);
      }
    } else {
      if (contentRef.current) {
        const text = contentRef.current.innerText || title;
        if (!text) return;
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechRate;
        utterance.onend = () => {
          setIsPlaying(false);
          setIsPaused(false);
        };
        // also handle onpause and onresume to keep state in sync if interrupted
        utterance.onpause = () => {
          setIsPaused(true);
          setIsPlaying(false);
        };
        utterance.onresume = () => {
          setIsPaused(false);
          setIsPlaying(true);
        };
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setIsPaused(false);
      }
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };
  
  const changeSpeechRate = () => {
    const nextRate = speechRate === 1 ? 1.25 : speechRate === 1.25 ? 1.5 : speechRate === 1.5 ? 2 : 1;
    setSpeechRate(nextRate);
    if (isPlaying) {
      stopSpeech();
      setTimeout(() => {
        const text = contentRef.current?.innerText || title;
        if (!text) return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = nextRate;
        utterance.onend = () => { setIsPlaying(false); setIsPaused(false); };
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
        setIsPaused(false);
      }, 50);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    const extractContent = async () => {
      setIsLoading(true);
      setError('');
      try {
        const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
        if (!webview) throw new Error('Webview bulunamadı.');

        // Get outerHTML of the current page
        const html = await webview.executeJavaScript(`document.documentElement.outerHTML`);
        
        // Parse with Readability
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Clone doc because Readability mutates it
        const reader = new Readability(doc.cloneNode(true) as Document);
        const article = reader.parse();

        if (article && article.content) {
          setTitle(article.title || '');
          setAuthor(article.byline || '');
          // Sanitize HTML to prevent XSS
          const cleanHtml = DOMPurify.sanitize(article.content);
          setContent(cleanHtml);
        } else {
          setError('Bu sayfadan içerik okunamadı.');
        }
      } catch (err: any) {
        setError(err.message || 'Okuma moduna geçilemedi.');
      } finally {
        setIsLoading(false);
      }
    };

    extractContent();
  }, [isActive, tabId, url]);

  if (!isActive) return null;

  const bgColors = {
    light: 'bg-white text-slate-800',
    dark: 'bg-slate-900 text-slate-300',
    sepia: 'bg-[#f4ecd8] text-[#5b4636]'
  };

  const fonts = {
    serif: 'font-serif',
    sans: 'font-sans'
  };

  const sizes = {
    sm: 'text-base leading-relaxed',
    md: 'text-lg leading-loose',
    lg: 'text-xl leading-loose'
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`absolute inset-0 z-50 overflow-y-auto ${bgColors[theme]} ${fonts[font]}`}
      >
        <div className="sticky top-0 p-4 flex items-center justify-between backdrop-blur-md bg-opacity-90 border-b border-black/5 dark:border-white/5">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Kapat
          </button>
          
          <div className="relative flex items-center gap-1">
            <div className="flex items-center gap-1 bg-black/5 dark:bg-white/10 rounded-full px-2 mr-2">
              <button 
                onClick={toggleSpeech}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
                title={isPlaying ? "Duraklat" : "Sesli Oku"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              {(isPlaying || isPaused) && (
                <button 
                  onClick={stopSpeech}
                  className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-red-500"
                  title="Durdur"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
              <div className="h-4 w-px bg-slate-300 dark:bg-slate-600 mx-1"></div>
              <button
                onClick={changeSpeechRate}
                className="flex items-center gap-1 p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20 transition-colors text-xs font-bold w-12 justify-center"
                title="Okuma Hızı"
              >
                {speechRate}x
              </button>
            </div>
            
            <button 
              onClick={() => setShowControls(!showControls)}
              className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <Type className="w-4 h-4" />
            </button>
            
            {showControls && (
              <div className="absolute top-full right-0 mt-2 p-4 rounded-xl shadow-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 flex flex-col gap-4 min-w-[200px]">
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">TEMA</div>
                  <div className="flex gap-2">
                    <button onClick={() => setTheme('light')} className={`flex-1 p-2 rounded border ${theme==='light' ? 'border-blue-500' : 'border-slate-200'} bg-white text-slate-900`}><Sun className="w-4 h-4 mx-auto"/></button>
                    <button onClick={() => setTheme('sepia')} className={`flex-1 p-2 rounded border ${theme==='sepia' ? 'border-amber-600' : 'border-amber-200'} bg-[#f4ecd8] text-amber-900`}>A</button>
                    <button onClick={() => setTheme('dark')} className={`flex-1 p-2 rounded border ${theme==='dark' ? 'border-blue-500' : 'border-slate-600'} bg-slate-900 text-white`}><Moon className="w-4 h-4 mx-auto"/></button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">FONT TİPİ</div>
                  <div className="flex gap-2">
                    <button onClick={() => setFont('sans')} className={`flex-1 p-2 rounded border text-sm font-sans ${font==='sans' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-600'}`}>Sans</button>
                    <button onClick={() => setFont('serif')} className={`flex-1 p-2 rounded border text-sm font-serif ${font==='serif' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-600'}`}>Serif</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-400 mb-2">BOYUT</div>
                  <div className="flex gap-2">
                    <button onClick={() => setFontSize('sm')} className={`flex-1 py-1 rounded border text-sm ${fontSize==='sm' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-600'}`}>A-</button>
                    <button onClick={() => setFontSize('md')} className={`flex-1 py-1 rounded border text-md ${fontSize==='md' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-600'}`}>A</button>
                    <button onClick={() => setFontSize('lg')} className={`flex-1 py-1 rounded border text-lg ${fontSize==='lg' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 dark:border-slate-600'}`}>A+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 pb-32">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p>İçerik ayıklanıyor...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-20 text-red-500">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{error}</p>
            </div>
          )}

          {content && !isLoading && !error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={sizes[fontSize]}>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{title}</h1>
              {author && <p className="text-sm opacity-60 mb-8 uppercase tracking-wider font-semibold">{author}</p>}
              <div 
                ref={contentRef}
                className="reader-content prose prose-lg dark:prose-invert max-w-none prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-md prose-headings:font-bold"
                dangerouslySetInnerHTML={{ __html: content }} 
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
