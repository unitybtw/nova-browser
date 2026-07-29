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
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Extract sentences when content changes
  useEffect(() => {
    if (contentRef.current) {
      // Basic sentence splitting (naive approach, handles most common cases)
      const text = contentRef.current.innerText || title;
      const splitRegex = /[^.!?\n]+[.!?\n]+/g;
      const matches = text.match(splitRegex) || [text];
      setSentences(matches.map(s => s.trim()).filter(s => s.length > 0));
      setCurrentSentenceIndex(0);
    }
  }, [content]);

  useEffect(() => {
    if (!isActive) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [isActive]);

  const speakSentence = (index: number, rate: number = speechRate) => {
    if (index >= sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      return;
    }
    window.speechSynthesis.cancel(); // Clear queue
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.rate = rate;
    
    utterance.onend = () => {
      // Check if we are still playing and haven't paused manually
      if (window.speechSynthesis.pending || window.speechSynthesis.speaking) return;
      setCurrentSentenceIndex(prev => {
        const next = prev + 1;
        // Schedule next sentence
        setTimeout(() => speakSentence(next, rate), 10);
        return next;
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      // Pause
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      // Start fresh or from where we left off
      if (sentences.length > 0) {
        setIsPlaying(true);
        setIsPaused(false);
        speakSentence(currentSentenceIndex);
      }
    }
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };
  
  const changeSpeechRate = () => {
    const nextRate = speechRate === 1 ? 1.25 : speechRate === 1.25 ? 1.5 : speechRate === 1.5 ? 2 : 1;
    setSpeechRate(nextRate);
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakSentence(currentSentenceIndex, nextRate);
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
        const clonedDoc = doc.cloneNode(true) as Document;
        
        // Fix relative URLs before parsing
        const makeAbsolute = (element: Element, attribute: string) => {
          const val = element.getAttribute(attribute);
          if (val) {
            try {
              element.setAttribute(attribute, new URL(val, url).href);
            } catch (e) {}
          }
        };
        clonedDoc.querySelectorAll('img').forEach(img => {
          makeAbsolute(img, 'src');
          makeAbsolute(img, 'data-src');
        });
        clonedDoc.querySelectorAll('a').forEach(a => makeAbsolute(a, 'href'));

        const reader = new Readability(clonedDoc);
        const article = reader.parse();

        if (article && article.content) {
          setTitle(article.title || '');
          setAuthor(article.byline || '');
          // Sanitize HTML to prevent XSS
          const cleanHtml = DOMPurify.sanitize(article.content, { ADD_ATTR: ['target'] });
          // Force links to open in a new tab within the reader (or handle them via onClick)
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
        <div className={`sticky top-0 p-4 flex items-center justify-between backdrop-blur-md bg-opacity-90 border-b ${theme === 'dark' ? 'border-white/5' : 'border-black/5'}`}>
          <button 
            onClick={onClose}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
          >
            <ArrowLeft className="w-4 h-4" /> Kapat
          </button>
          
          <div className="relative flex items-center gap-1">
            <div className={`flex items-center gap-1 rounded-full px-2 mr-2 ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}>
              <button 
                onClick={toggleSpeech}
                className={`p-1.5 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                title={isPlaying ? "Duraklat" : "Sesli Oku"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              {(isPlaying || isPaused) && (
                <button 
                  onClick={stopSpeech}
                  className={`p-1.5 rounded-full transition-colors text-red-500 ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title="Durdur"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
              <div className={`h-4 w-px mx-1 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
              <button
                onClick={changeSpeechRate}
                className={`flex items-center gap-1 p-1.5 rounded-full transition-colors text-xs font-bold w-12 justify-center ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                title="Okuma Hızı"
              >
                {speechRate}x
              </button>
            </div>
            
            <button 
              onClick={() => setShowControls(!showControls)}
              className={`p-2 rounded-full transition-colors ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
            >
              <Type className="w-4 h-4" />
            </button>
            
            {showControls && (
              <div className={`absolute top-full right-4 mt-2 p-5 rounded-2xl shadow-2xl border flex flex-col gap-5 min-w-[240px] z-[100] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-black/50' : 'bg-white border-slate-200'}`}>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">TEMA</div>
                  <div className="flex gap-2">
                    <button onClick={() => setTheme('light')} className={`flex-1 p-2.5 rounded-xl border transition-all ${theme==='light' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} bg-white text-slate-900 hover:scale-105`} title="Açık Tema"><Sun className="w-5 h-5 mx-auto"/></button>
                    <button onClick={() => setTheme('sepia')} className={`flex-1 p-2.5 rounded-xl border transition-all ${theme==='sepia' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-amber-200'} bg-[#f4ecd8] text-amber-900 font-serif font-bold text-lg hover:scale-105`} title="Sepya Tema">A</button>
                    <button onClick={() => setTheme('dark')} className={`flex-1 p-2.5 rounded-xl border transition-all ${theme==='dark' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-600'} bg-slate-900 text-white hover:scale-105`} title="Karanlık Tema"><Moon className="w-5 h-5 mx-auto"/></button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">YAZI TİPİ</div>
                  <div className="flex gap-2">
                    <button onClick={() => setFont('sans')} className={`flex-1 p-2 rounded-lg border text-sm font-sans font-medium transition-all ${font==='sans' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Modern</button>
                    <button onClick={() => setFont('serif')} className={`flex-1 p-2 rounded-lg border text-sm font-serif transition-all ${font==='serif' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Klasik</button>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">BOYUT</div>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setFontSize('sm')} className={`flex-1 py-1.5 rounded-lg border text-sm transition-all ${fontSize==='sm' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A-</button>
                    <button onClick={() => setFontSize('md')} className={`flex-1 py-1.5 rounded-lg border text-base font-medium transition-all ${fontSize==='md' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A</button>
                    <button onClick={() => setFontSize('lg')} className={`flex-1 py-1.5 rounded-lg border text-lg font-bold transition-all ${fontSize==='lg' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A+</button>
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
                className={`reader-content prose prose-lg max-w-none prose-a:text-blue-500 hover:prose-a:text-blue-600 prose-img:rounded-xl prose-img:shadow-md prose-headings:font-bold ${theme === 'dark' ? 'prose-invert' : ''}`}
                dangerouslySetInnerHTML={{ __html: content }} 
              />
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
