import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Sun, Moon, ArrowLeft, ShieldAlert, Play, Pause, Square } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Readability } from '@mozilla/readability';

interface HighlightData {
  id: string;
  text: string;
  color: string;
  note: string;
  path: string;
  offset: number;
}

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

  // Highlights State
  const [highlights, setHighlights] = useState<HighlightData[]>([]);
  const [popoverState, setPopoverState] = useState<{
    visible: boolean;
    top: number;
    left: number;
    text: string;
    range?: Range;
    existingId?: string;
    existingNote?: string;
    existingColor?: string;
  }>({ visible: false, top: 0, left: 0, text: '' });
  const [noteText, setNoteText] = useState('');
  const [highlightColor, setHighlightColor] = useState('#fef08a');
  const [viewingNote, setViewingNote] = useState<{ visible: boolean; note: string; top: number; left: number }>({ visible: false, note: '', top: 0, left: 0 });

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

  // Load highlights from storage when content is ready
  useEffect(() => {
    if (content && url) {
      const storageKey = 'reader_highlights_' + btoa(url);
      (window as any).electronAPI?.storeGet(storageKey).then((saved: string) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setHighlights(parsed);
            
            // Re-apply to DOM
            setTimeout(() => {
              if (!contentRef.current) return;
              const walkDOM = (node: Node, textToFind: string): Range | null => {
                if (node.nodeType === 3) { // Text node
                  const idx = node.nodeValue?.indexOf(textToFind);
                  if (idx !== undefined && idx !== -1) {
                    const range = document.createRange();
                    range.setStart(node, idx);
                    range.setEnd(node, idx + textToFind.length);
                    return range;
                  }
                }
                for (let i = 0; i < node.childNodes.length; i++) {
                  const r = walkDOM(node.childNodes[i], textToFind);
                  if (r) return r;
                }
                return null;
              };

              parsed.forEach((h: HighlightData) => {
                if (contentRef.current) {
                  const range = walkDOM(contentRef.current, h.text);
                  if (range) {
                    const span = document.createElement('mark');
                    span.style.backgroundColor = h.color;
                    span.style.cursor = 'pointer';
                    span.dataset.id = h.id;
                    span.onclick = (e) => {
                      e.stopPropagation();
                      setViewingNote({
                        visible: true,
                        note: h.note,
                        top: e.clientY,
                        left: e.clientX
                      });
                    };
                    try {
                      range.surroundContents(span);
                    } catch (e) {}
                  }
                }
              });
            }, 100);
          } catch (e) {
            console.error('Failed to parse highlights', e);
          }
        }
      });
    }
  }, [content, url]);

  // Handle selection for highlighting
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !contentRef.current) {
        return;
      }
      if (!contentRef.current.contains(selection.anchorNode)) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setPopoverState({
        visible: true,
        top: rect.top,
        left: rect.left + rect.width / 2,
        text: selection.toString(),
        range: range.cloneRange()
      });
      setNoteText('');
      setHighlightColor('#fef08a');
      setViewingNote({ visible: false, note: '', top: 0, left: 0 });
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => document.removeEventListener('mouseup', handleSelectionChange);
  }, [content]);

  const saveHighlight = () => {
    if (!popoverState.range) return;

    const id = popoverState.existingId || Math.random().toString(36).substr(2, 9);
    const newHighlight: HighlightData = {
      id,
      text: popoverState.text,
      color: highlightColor,
      note: noteText,
      path: '',
      offset: 0
    };

    let updated = [];
    if (popoverState.existingId) {
      updated = highlights.map(h => h.id === id ? newHighlight : h);
    } else {
      updated = [...highlights, newHighlight];
      
      const span = document.createElement('mark');
      span.style.backgroundColor = highlightColor;
      span.style.cursor = 'pointer';
      span.dataset.id = id;
      span.onclick = (e) => {
        e.stopPropagation();
        setViewingNote({
          visible: true,
          note: newHighlight.note,
          top: e.clientY,
          left: e.clientX
        });
        setPopoverState(prev => ({ ...prev, visible: false }));
      };
      
      try {
        popoverState.range.surroundContents(span);
      } catch (e) {}
    }

    setHighlights(updated);
    if (url) {
      const storageKey = 'reader_highlights_' + btoa(url);
      (window as any).electronAPI?.storeSet(storageKey, JSON.stringify(updated));
    }
    
    setPopoverState({ visible: false, top: 0, left: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const closePopover = () => {
    setPopoverState({ visible: false, top: 0, left: 0, text: '' });
  };

  // Extract sentences when content changes
  useEffect(() => {
    if (contentRef.current) {
      const text = contentRef.current.innerText || title;
      const splitRegex = /[^.!?\n]+[.!?\n]+/g;
      const matches = text.match(splitRegex) || [text];
      const parsed = matches.map(s => s.trim()).filter(s => s.length > 0);
      setSentences(parsed);
      setCurrentSentenceIndex(0);
    }
  }, [content, title]);

  useEffect(() => {
    if (!isActive) {
      isPlayingRef.current = false;
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
    return () => {
      isPlayingRef.current = false;
      window.speechSynthesis.cancel();
    };
  }, [isActive]);

  const speakSentence = (index: number, rate: number = speechRate, targetSentences: string[] = sentences) => {
    if (!isPlayingRef.current || index >= targetSentences.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(targetSentences[index]);
    utterance.rate = rate;
    utterance.pitch = 1.1; // Slightly higher pitch to sound less robotic
    
    let voices = window.speechSynthesis.getVoices();
    // Prefer higher quality local or Google voices
    let betterVoice = voices.find(v => 
      (v.name.includes('Google') && !v.name.includes('Translate')) || 
      v.name.includes('Siri') || 
      v.name.includes('Premium') ||
      v.name === 'Samantha' ||
      v.name === 'Yelda'
    );
    
    // Fallback avoiding known robotic voices
    if (!betterVoice) {
      betterVoice = voices.find(v => !v.name.includes('Alex') && !v.name.includes('Fred') && !v.name.includes('Zarvox') && !v.name.includes('Trinoids')) || voices[0];
    }
    
    if (betterVoice) {
      utterance.voice = betterVoice;
    }
    
    utterance.onend = () => {
      if (!isPlayingRef.current) return;
      const next = index + 1;
      if (next < targetSentences.length) {
        setCurrentSentenceIndex(next);
        setTimeout(() => speakSentence(next, rate, targetSentences), 20);
      } else {
        isPlayingRef.current = false;
        setIsPlaying(false);
        setIsPaused(false);
        setCurrentSentenceIndex(0);
      }
    };

    utterance.onerror = () => {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      isPlayingRef.current = false;
      window.speechSynthesis.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else if (isPaused) {
      isPlayingRef.current = true;
      window.speechSynthesis.resume();
      setIsPlaying(true);
      setIsPaused(false);
    } else {
      let currentSentences = sentences;
      if (currentSentences.length === 0 && contentRef.current) {
        const text = contentRef.current.innerText || title || '';
        const splitRegex = /[^.!?\n]+[.!?\n]+/g;
        const matches = text.match(splitRegex) || [text];
        currentSentences = matches.map(s => s.trim()).filter(s => s.length > 0);
        setSentences(currentSentences);
      }

      if (currentSentences.length > 0) {
        isPlayingRef.current = true; // Synchronous ref update
        setIsPlaying(true);
        setIsPaused(false);
        speakSentence(currentSentenceIndex, speechRate, currentSentences);
      }
    }
  };

  const stopSpeech = () => {
    isPlayingRef.current = false;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };
  
  const changeSpeechRate = () => {
    const nextRate = speechRate === 1 ? 1.25 : speechRate === 1.25 ? 1.5 : speechRate === 1.5 ? 2 : 1;
    setSpeechRate(nextRate);
    if (isPlaying) {
      isPlayingRef.current = true;
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

  const highlightColors = [
    { name: 'Yellow', hex: '#fef08a' },
    { name: 'Green', hex: '#bbf7d0' },
    { name: 'Pink', hex: '#fbcfe8' }
  ];

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
            
            <div className="relative flex items-center gap-1 no-drag" ref={controlsRef}>
              <div className={`flex items-center gap-1 rounded-full px-2 mr-2 no-drag ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}>
                <button 
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-full transition-colors no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title={isPlaying ? "Duraklat" : "Sesli Oku"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                {(isPlaying || isPaused) && (
                  <button 
                    onClick={stopSpeech}
                    className={`p-1.5 rounded-full transition-colors text-red-500 no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                    title="Durdur"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
                <div className={`h-4 w-px mx-1 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                <button
                  onClick={changeSpeechRate}
                  className={`flex items-center gap-1 p-1.5 rounded-full transition-colors text-xs font-bold w-12 justify-center no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title="Okuma Hızı"
                >
                  {speechRate}x
                </button>
              </div>
              
              <button 
                onClick={() => setShowControls(!showControls)}
                className={`p-2 rounded-full transition-colors no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                title="Görünüm Ayarları"
              >
                <Type className="w-4 h-4" />
              </button>
              
              {showControls && (
                <div className={`absolute top-full right-0 mt-2 p-5 rounded-2xl shadow-2xl border flex flex-col gap-5 min-w-[260px] z-[100] no-drag ${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-black/50 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">TEMA</div>
                    <div className="flex gap-2">
                      <button onClick={() => setTheme('light')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer ${theme==='light' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-200'} bg-white text-slate-900 hover:scale-105`} title="Açık Tema"><Sun className="w-5 h-5 mx-auto"/></button>
                      <button onClick={() => setTheme('sepia')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer ${theme==='sepia' ? 'border-amber-600 ring-2 ring-amber-600/20' : 'border-amber-200'} bg-[#f4ecd8] text-amber-900 font-serif font-bold text-lg hover:scale-105`} title="Sepya Tema">A</button>
                      <button onClick={() => setTheme('dark')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer ${theme==='dark' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-slate-600'} bg-slate-900 text-white hover:scale-105`} title="Karanlık Tema"><Moon className="w-5 h-5 mx-auto"/></button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">YAZI TİPİ</div>
                    <div className="flex gap-2">
                      <button onClick={() => setFont('sans')} className={`flex-1 p-2 rounded-lg border text-sm font-sans font-medium transition-all no-drag cursor-pointer ${font==='sans' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Modern</button>
                      <button onClick={() => setFont('serif')} className={`flex-1 p-2 rounded-lg border text-sm font-serif transition-all no-drag cursor-pointer ${font==='serif' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>Klasik</button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-400 mb-3 tracking-wider">BOYUT</div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setFontSize('sm')} className={`flex-1 py-1.5 rounded-lg border text-sm transition-all no-drag cursor-pointer ${fontSize==='sm' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A-</button>
                      <button onClick={() => setFontSize('md')} className={`flex-1 py-1.5 rounded-lg border text-base font-medium transition-all no-drag cursor-pointer ${fontSize==='md' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A</button>
                      <button onClick={() => setFontSize('lg')} className={`flex-1 py-1.5 rounded-lg border text-lg font-bold transition-all no-drag cursor-pointer ${fontSize==='lg' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'}`}>A+</button>
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
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} 
                />
              </motion.div>
            )}
          </div>

          {/* Highlight Creation Popover */}
          <AnimatePresence>
            {popoverState.visible && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="fixed z-[100] shadow-2xl rounded-xl p-3 border w-64 text-sm"
                style={{ 
                  top: Math.max(10, popoverState.top - 10), 
                  left: popoverState.left, 
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                <div className="flex gap-2 mb-3">
                  {highlightColors.map(c => (
                    <button 
                      key={c.name}
                      onClick={() => setHighlightColor(c.hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all ${highlightColor === c.hex ? 'border-blue-500 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
                <textarea 
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Not ekle (Markdown)..."
                  className="w-full h-20 p-2 rounded mb-2 resize-none outline-none border transition-colors"
                  style={{
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={closePopover} 
                    className="px-3 py-1 rounded transition-colors text-xs font-medium"
                    style={{
                      color: theme === 'dark' ? '#cbd5e1' : '#64748b'
                    }}
                  >
                    İptal
                  </button>
                  <button 
                    onClick={saveHighlight} 
                    className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors text-xs font-medium"
                  >
                    Kaydet
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View Note Popover */}
          <AnimatePresence>
            {viewingNote.visible && viewingNote.note && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed z-[100] shadow-2xl rounded-xl p-4 border max-w-sm"
                style={{ 
                  top: viewingNote.top + 10, 
                  left: viewingNote.left, 
                  transform: 'translateX(-50%)',
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider opacity-50">Not</span>
                  <button onClick={() => setViewingNote({ visible: false, note: '', top: 0, left: 0 })} className="opacity-50 hover:opacity-100">
                    &times;
                  </button>
                </div>
                <div className="text-sm whitespace-pre-wrap">{viewingNote.note}</div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
