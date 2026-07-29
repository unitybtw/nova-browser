import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Sun, Moon, ArrowLeft, ShieldAlert, Play, Pause, Square } from 'lucide-react';
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
  
  const contentRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);

  // Keep isPlayingRef updated
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Close controls dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
        setShowControls(false);
      }
    };
    if (showControls) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showControls]);

  // Extract sentences when content changes
  useEffect(() => {
    if (contentRef.current) {
      const text = contentRef.current.innerText || title;
      const splitRegex = /[^.!?\n]+[.!?\n]+/g;
      const matches = text.match(splitRegex) || [text];
      setSentences(matches.map(s => s.trim()).filter(s => s.length > 0));
      setCurrentSentenceIndex(0);
    }
  }, [content, title]);

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
    if (!isPlayingRef.current || index >= sentences.length) {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.rate = rate;
    
    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      const next = index + 1;
      if (next < sentences.length) {
        setCurrentSentenceIndex(next);
        setTimeout(() => speakSentence(next, rate), 20);
      } else {
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
      }
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
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
      setContent(null);

      if (!url || url.startsWith('nova://') || url.startsWith('about:')) {
        setError('Okuma modu bu özel sayfada kullanılamaz.');
        setIsLoading(false);
        return;
      }

      try {
        const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
        if (!webview) throw new Error('Web tarayıcı bileşeni yüklenemedi.');

        const html = await webview.executeJavaScript(`document.documentElement.outerHTML`);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const clonedDoc = doc.cloneNode(true) as Document;
        
        // Add base element for resolving relative links & images
        try {
          const base = clonedDoc.createElement('base');
          base.href = url;
          clonedDoc.head.appendChild(base);
        } catch (e) {}

        const reader = new Readability(clonedDoc);
        const article = reader.parse();

        if (article && article.content) {
          setTitle(article.title || '');
          setAuthor(article.byline || '');
          const cleanHtml = DOMPurify.sanitize(article.content, { ADD_ATTR: ['target'] });
          setContent(cleanHtml);
        } else {
          setError('Bu sayfadaki metin içeriği okuma modu için uygun bulunamadı.');
        }
      } catch (err: any) {
        setError(err.message || 'Sayfa içeriği okunamadı.');
      } finally {
        setIsLoading(false);
      }
    };

    extractContent();
  }, [isActive, tabId, url]);

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
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          className={`fixed inset-0 z-50 overflow-y-auto ${bgColors[theme]} ${fonts[font]}`}
        >
          {/* Header Bar */}
          <div className={`sticky top-0 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-opacity-90 border-b z-40 ${theme === 'dark' ? 'border-white/10 bg-slate-900/90' : theme === 'sepia' ? 'border-amber-900/10 bg-[#f4ecd8]/90' : 'border-black/5 bg-white/90'}`}>
            <div className="flex items-center gap-2 no-drag">
              {/* Mac Traffic Lights Spacer */}
              <div className="w-[68px] shrink-0" />
              <button 
                onClick={onClose}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors text-sm font-medium no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-black/5 text-slate-800'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Kapat
              </button>
            </div>
            
            <div className="relative flex items-center gap-1" ref={controlsRef}>
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
                title="Görünüm Ayarları"
              >
                <Type className="w-4 h-4" />
              </button>
              
              {showControls && (
                <div className={`absolute top-full right-0 mt-2 p-5 rounded-2xl shadow-2xl border flex flex-col gap-5 min-w-[260px] z-[100] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-black/50 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
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
      )}
    </AnimatePresence>
  );
};
