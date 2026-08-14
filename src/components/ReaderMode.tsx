import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Type, Sun, Moon, ArrowLeft, ShieldAlert, Play, Pause, Square, Trash2, Clock, BookOpen, Volume2, Globe, Sparkles } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Readability } from '@mozilla/readability';
import { detectLanguage, getBestVoice, getMacDefaultVoice, NativeVoiceInfo } from '../services/tts';

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

const safeBase64 = (str: string): string => {
  if (!str) return '';
  const wellFormed = typeof (str as any).toWellFormed === 'function'
    ? (str as any).toWellFormed()
    : str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '\uFFFD');

  try {
    return btoa(unescape(encodeURIComponent(wellFormed)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  } catch (e) {
    return wellFormed.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
};

export const ReaderMode: React.FC<ReaderModeProps> = ({ url, tabId, isActive, onClose }) => {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [font, setFont] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [columnWidth, setColumnWidth] = useState<'narrow' | 'normal' | 'wide'>('normal');
  const [showControls, setShowControls] = useState(false);

  // Native macOS & TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState('tr-TR');
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'tr-TR' | 'en-US' | 'de-DE' | 'fr-FR' | 'es-ES'>('auto');
  
  // Voices (Native OS + Web Speech)
  const [nativeVoices, setNativeVoices] = useState<NativeVoiceInfo[]>([]);
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');
  
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
  const [viewingNote, setViewingNote] = useState<{
    visible: boolean;
    id?: string;
    note: string;
    top: number;
    left: number;
  }>({ visible: false, note: '', top: 0, left: 0 });

  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  // Fetch Native macOS voices & Web Speech voices
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsGetVoices) {
      (window as any).electronAPI.nativeTtsGetVoices().then((voices: NativeVoiceInfo[]) => {
        if (Array.isArray(voices) && voices.length > 0) {
          setNativeVoices(voices);
        }
      });
    }

    const updateWebVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setWebVoices(window.speechSynthesis.getVoices());
      }
    };
    updateWebVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateWebVoices;
    }
  }, []);

  // Escape key support to close modals or reader mode
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (popoverState.visible) {
          setPopoverState(prev => ({ ...prev, visible: false }));
        } else if (viewingNote.visible) {
          setViewingNote({ visible: false, note: '', top: 0, left: 0 });
        } else if (showControls) {
          setShowControls(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, popoverState.visible, viewingNote.visible, showControls, onClose]);

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
      const storageKey = 'reader_highlights_' + safeBase64(url);
      (window as any).electronAPI?.storeGet(storageKey).then((saved: string) => {
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setHighlights(parsed);
            
            setTimeout(() => {
              if (!contentRef.current) return;
              const walkDOM = (node: Node, textToFind: string): Range | null => {
                if (node.nodeType === 3) {
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
                        id: h.id,
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
          id,
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
      const storageKey = 'reader_highlights_' + safeBase64(url);
      (window as any).electronAPI?.storeSet(storageKey, JSON.stringify(updated));
    }
    
    setPopoverState({ visible: false, top: 0, left: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = (id?: string) => {
    const targetId = id || viewingNote.id;
    if (!targetId) return;

    const updated = highlights.filter(h => h.id !== targetId);
    setHighlights(updated);

    if (contentRef.current) {
      const mark = contentRef.current.querySelector(`mark[data-id="${targetId}"]`);
      if (mark && mark.parentNode) {
        const textNode = document.createTextNode(mark.textContent || '');
        mark.parentNode.replaceChild(textNode, mark);
      }
    }

    if (url) {
      const storageKey = 'reader_highlights_' + safeBase64(url);
      (window as any).electronAPI?.storeSet(storageKey, JSON.stringify(updated));
    }

    setViewingNote({ visible: false, note: '', top: 0, left: 0 });
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

      // Detect language
      const lang = detectLanguage(text);
      setDetectedLang(lang);
    }
  }, [content, title]);

  useEffect(() => {
    if (!isActive) {
      stopSpeech();
    }
    return () => {
      stopSpeech();
    };
  }, [isActive]);

  const effectiveLanguage = selectedLanguage === 'auto' ? detectedLang : selectedLanguage;

  const speakSentence = async (index: number, rate: number = speechRate, targetSentences: string[] = sentences) => {
    if (!isPlayingRef.current || index >= targetSentences.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentSentenceIndex(0);
      return;
    }

    const currentSentence = targetSentences[index];

    // Check if macOS native TTS is available
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsSpeak) {
      const voice = selectedVoiceName || getMacDefaultVoice(effectiveLanguage);
      try {
        const res = await (window as any).electronAPI.nativeTtsSpeak(currentSentence, voice, rate);
        if (!isPlayingRef.current) return;
        if (res && res.success) {
          const next = index + 1;
          if (next < targetSentences.length) {
            setCurrentSentenceIndex(next);
            setTimeout(() => speakSentence(next, rate, targetSentences), 40);
          } else {
            isPlayingRef.current = false;
            setIsPlaying(false);
            setIsPaused(false);
            setCurrentSentenceIndex(0);
          }
          return;
        }
      } catch (e) {
        console.warn('Native TTS error, falling back to Web Speech:', e);
      }
    }

    // Web Speech Fallback
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentSentence);
      utterance.lang = effectiveLanguage;
      utterance.rate = rate;
      utterance.pitch = 1.0;
      
      const voices = window.speechSynthesis.getVoices();
      let chosenVoice: SpeechSynthesisVoice | null = null;
      if (selectedVoiceName) {
        chosenVoice = voices.find(v => v.name.includes(selectedVoiceName) || v.voiceURI === selectedVoiceName) || null;
      }
      if (!chosenVoice) {
        chosenVoice = getBestVoice(voices, effectiveLanguage);
      }
      if (chosenVoice) utterance.voice = chosenVoice;

      utterance.onend = () => {
        if (!isPlayingRef.current) return;
        const next = index + 1;
        if (next < targetSentences.length) {
          setCurrentSentenceIndex(next);
          setTimeout(() => speakSentence(next, rate, targetSentences), 30);
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
    }
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      isPlayingRef.current = false;
      if ((window as any).electronAPI?.nativeTtsStop) (window as any).electronAPI.nativeTtsStop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(true);
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
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsPaused(false);
        speakSentence(currentSentenceIndex, speechRate, currentSentences);
      }
    }
  };

  const stopSpeech = () => {
    isPlayingRef.current = false;
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsStop) {
      (window as any).electronAPI.nativeTtsStop();
    }
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };
  
  const changeSpeechRate = () => {
    const nextRate = speechRate === 1 ? 1.25 : speechRate === 1.25 ? 1.5 : speechRate === 1.5 ? 2 : 1;
    setSpeechRate(nextRate);
    if (isPlaying) {
      isPlayingRef.current = true;
      if ((window as any).electronAPI?.nativeTtsStop) (window as any).electronAPI.nativeTtsStop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
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
        setError('Reader mode is not available on this special page.');
        setIsLoading(false);
        return;
      }

      try {
        const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
        if (!webview) throw new Error('Web browser component failed to load.');

        const html = await webview.executeJavaScript(`document.documentElement.outerHTML`);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const clonedDoc = doc.cloneNode(true) as Document;
        
        try {
          const base = clonedDoc.createElement('base');
          base.href = url;
          clonedDoc.head.appendChild(base);
        } catch (e) {}

        const images = clonedDoc.querySelectorAll('img');
        images.forEach((img) => {
          const lazySrc = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy-src') || img.getAttribute('srcset')?.split(' ')[0];
          if (lazySrc && (!img.src || img.src.startsWith('data:image/svg') || img.src.startsWith('data:image/gif') || img.src.length < 50)) {
            try {
              img.src = new URL(lazySrc, url).href;
            } catch (_) {}
          }
        });

        const reader = new Readability(clonedDoc);
        const article = reader.parse();

        if (article && article.content) {
          setTitle(article.title || '');
          setAuthor(article.byline || '');
          
          const textContent = article.textContent || '';
          const words = textContent.trim().split(/\s+/).filter(Boolean).length;
          setWordCount(words);
          setReadingTime(Math.max(1, Math.ceil(words / 200)));

          const cleanHtml = DOMPurify.sanitize(article.content, { 
            ADD_ATTR: ['target', 'src', 'srcset', 'alt', 'title'],
            ADD_TAGS: ['figure', 'figcaption', 'picture', 'source', 'mark']
          });
          setContent(cleanHtml);
        } else {
          setError('The text content on this page is not suitable for reader mode.');
        }
      } catch (err: any) {
        setError(err.message || 'Page content could not be read.');
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
    sans: 'font-sans',
    serif: 'font-serif',
    mono: 'font-mono'
  };

  const sizes = {
    sm: 'text-base leading-relaxed',
    md: 'text-lg leading-loose',
    lg: 'text-xl leading-loose'
  };

  const columnWidths = {
    narrow: 'max-w-xl',
    normal: 'max-w-3xl',
    wide: 'max-w-5xl'
  };

  const highlightColors = [
    { name: 'Yellow', hex: '#fef08a' },
    { name: 'Green', hex: '#bbf7d0' },
    { name: 'Pink', hex: '#fbcfe8' }
  ];

  // Voices matching the effective language
  const targetPrefix = effectiveLanguage.toLowerCase().split('-')[0];
  const activeNativeVoices = nativeVoices.filter(v => v.lang.toLowerCase().startsWith(targetPrefix));
  const activeWebVoices = webVoices.filter(v => v.lang.toLowerCase().startsWith(targetPrefix));

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          transition={{ duration: 0.18 }}
          className={`fixed inset-0 z-50 overflow-y-auto ${bgColors[theme]} ${fonts[font]}`}
        >
          {/* Header Bar */}
          <div className={`sticky top-0 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-opacity-90 border-b z-40 ${theme === 'dark' ? 'border-white/10 bg-slate-900/90' : theme === 'sepia' ? 'border-amber-900/10 bg-[#f4ecd8]/90' : 'border-black/5 bg-white/90'}`}>
            <div className="flex items-center gap-2 no-drag">
              {isMac && <div className="w-[68px] shrink-0" />}
              <button 
                onClick={onClose}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-colors text-sm font-medium no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-black/5 text-slate-800'}`}
              >
                <ArrowLeft className="w-4 h-4" /> Close
              </button>
            </div>
            
            <div className="relative flex items-center gap-1 no-drag" ref={controlsRef}>
              {/* Audio Read Aloud Player */}
              <div className={`flex items-center gap-1 rounded-full px-2.5 py-1 mr-2 no-drag shadow-xs ${theme === 'dark' ? 'bg-white/10' : 'bg-black/5'}`}>
                <button 
                  onClick={toggleSpeech}
                  className={`p-1.5 rounded-full transition-colors no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title={isPlaying ? "Pause" : "Read Aloud with Natural Voice"}
                >
                  {isPlaying ? <Pause className="w-4 h-4 text-blue-500" /> : <Play className="w-4 h-4 ml-0.5 text-blue-500" />}
                </button>
                {(isPlaying || isPaused) && (
                  <button 
                    onClick={stopSpeech}
                    className={`p-1.5 rounded-full transition-colors text-red-500 no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                    title="Stop"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                  </button>
                )}
                <div className={`h-4 w-px mx-1 ${theme === 'dark' ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
                <button
                  onClick={changeSpeechRate}
                  className={`flex items-center gap-1 p-1 rounded-full transition-colors text-xs font-bold w-10 justify-center no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/20' : 'hover:bg-black/10'}`}
                  title="Reading Speed"
                >
                  {speechRate}x
                </button>
              </div>
              
              <button 
                onClick={() => setShowControls(!showControls)}
                className={`p-2 rounded-full transition-colors no-drag cursor-pointer ${showControls ? 'bg-blue-500 text-white' : theme === 'dark' ? 'hover:bg-white/10 text-slate-200' : 'hover:bg-black/5 text-slate-800'}`}
                title="Appearance & macOS Natural Voice Settings"
              >
                <Type className="w-4 h-4" />
              </button>
              
              {showControls && (
                <div className={`absolute top-full right-0 mt-2 p-5 rounded-2xl shadow-2xl border flex flex-col gap-5 min-w-[320px] z-[100] no-drag ${theme === 'dark' ? 'bg-slate-800 border-slate-700 shadow-black/50 text-slate-100' : 'bg-white border-slate-200 text-slate-800'}`}>
                  {/* Theme */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 tracking-wider uppercase">Theme</div>
                    <div className="flex gap-2">
                      <button onClick={() => setTheme('light')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer flex items-center justify-center ${theme==='light' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200'} bg-white text-slate-900 hover:scale-105`} title="Light Theme"><Sun className="w-5 h-5"/></button>
                      <button onClick={() => setTheme('sepia')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer flex items-center justify-center ${theme==='sepia' ? 'border-amber-600 ring-2 ring-amber-600/20 shadow-sm' : 'border-amber-200'} bg-[#f4ecd8] text-amber-900 font-serif font-bold text-lg hover:scale-105`} title="Sepia Theme">A</button>
                      <button onClick={() => setTheme('dark')} className={`flex-1 p-2.5 rounded-xl border transition-all no-drag cursor-pointer flex items-center justify-center ${theme==='dark' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-600'} bg-slate-900 text-white hover:scale-105`} title="Dark Theme"><Moon className="w-5 h-5"/></button>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 tracking-wider uppercase">Typeface</div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setFont('sans')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-sans font-medium transition-all no-drag cursor-pointer ${font==='sans' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Modern</button>
                      <button onClick={() => setFont('serif')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-serif transition-all no-drag cursor-pointer ${font==='serif' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Classic</button>
                      <button onClick={() => setFont('mono')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-mono transition-all no-drag cursor-pointer ${font==='mono' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Mono</button>
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 tracking-wider uppercase">Text Size</div>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setFontSize('sm')} className={`flex-1 py-1.5 rounded-lg border text-xs transition-all no-drag cursor-pointer ${fontSize==='sm' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>A-</button>
                      <button onClick={() => setFontSize('md')} className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all no-drag cursor-pointer ${fontSize==='md' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>A</button>
                      <button onClick={() => setFontSize('lg')} className={`flex-1 py-1.5 rounded-lg border text-base font-bold transition-all no-drag cursor-pointer ${fontSize==='lg' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>A+</button>
                    </div>
                  </div>

                  {/* Column Width */}
                  <div>
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 tracking-wider uppercase">Column Width</div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setColumnWidth('narrow')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-all no-drag cursor-pointer ${columnWidth==='narrow' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Narrow</button>
                      <button onClick={() => setColumnWidth('normal')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-all no-drag cursor-pointer ${columnWidth==='normal' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Standard</button>
                      <button onClick={() => setColumnWidth('wide')} className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-all no-drag cursor-pointer ${columnWidth==='wide' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300' : theme === 'dark' ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-50'}`}>Wide</button>
                    </div>
                  </div>

                  {/* Apple / macOS High Quality Voice Options */}
                  <div className="border-t pt-4 border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 mb-2.5 tracking-wider uppercase">
                      <Volume2 className="w-3.5 h-3.5" /> macOS Doğal Ses & Dil
                    </div>
                    
                    <div className="space-y-2.5">
                      {/* Language Selection */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Dil
                        </span>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => {
                            setSelectedLanguage(e.target.value as any);
                            setSelectedVoiceName('');
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer ${
                            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="auto">Otomatik ({detectedLang.startsWith('tr') ? 'Türkçe' : detectedLang.startsWith('de') ? 'Almanca' : detectedLang.startsWith('fr') ? 'Fransızca' : detectedLang.startsWith('es') ? 'İspanyolca' : 'İngilizce'})</option>
                          <option value="tr-TR">Türkçe (Yelda)</option>
                          <option value="en-US">İngilizce (Samantha)</option>
                          <option value="de-DE">Almanca (Anna)</option>
                          <option value="fr-FR">Fransızca (Thomas)</option>
                          <option value="es-ES">İspanyolca (Mónica)</option>
                        </select>
                      </div>

                      {/* macOS Native Voice Picker */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Ses
                        </span>
                        <select
                          value={selectedVoiceName}
                          onChange={(e) => setSelectedVoiceName(e.target.value)}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border outline-none cursor-pointer max-w-[190px] truncate ${
                            theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                          }`}
                        >
                          <option value="">
                            ✨ {isMac ? (effectiveLanguage.startsWith('tr') ? 'Yelda (Apple Doğal)' : 'Samantha (Apple Natural)') : 'En İyi Doğal Ses'}
                          </option>
                          
                          {activeNativeVoices.length > 0 && (
                            <optgroup label="macOS Sistem Sesleri">
                              {activeNativeVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                  🍎 {v.name}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {activeWebVoices.length > 0 && activeNativeVoices.length === 0 && (
                            <optgroup label="Yüklü Sesler">
                              {activeWebVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                  {v.name.replace(/Google|Microsoft|Apple|Online \(Natural\)/gi, '').trim() || v.name}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={`${columnWidths[columnWidth]} mx-auto px-6 py-12 pb-32 transition-all duration-300`}>
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium">Extracting article content...</p>
              </div>
            )}
            
            {error && (
              <div className="text-center py-20 text-red-500">
                <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium">{error}</p>
              </div>
            )}

            {content && !isLoading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={sizes[fontSize]}>
                <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">{title}</h1>
                
                {/* Article Metadata Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs opacity-70 mb-8 border-b pb-4 border-current/10">
                  {author && <span className="font-semibold uppercase tracking-wider">{author}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {readingTime} dk okuma
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {wordCount.toLocaleString()} kelime
                  </span>
                  <span className="flex items-center gap-1 text-blue-500 font-medium">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    {isMac ? (effectiveLanguage.startsWith('tr') ? '🍎 macOS Yelda Sesi' : '🍎 macOS Samantha Sesi') : 'Doğal İnsan Sesi'}
                  </span>
                </div>

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
                className="fixed z-[100] shadow-2xl rounded-2xl p-3.5 border w-72 text-sm"
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
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Color</span>
                  <div className="flex gap-2">
                    {highlightColors.map(c => (
                      <button 
                        key={c.name}
                        onClick={() => setHighlightColor(c.hex)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${highlightColor === c.hex ? 'border-blue-500 scale-110 shadow-xs' : 'border-transparent'}`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
                <textarea 
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="Add note (optional)..."
                  className="w-full h-20 p-2.5 rounded-xl mb-2.5 resize-none outline-none border text-xs transition-colors"
                  style={{
                    backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
                    borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                    color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={closePopover} 
                    className="px-3 py-1.5 rounded-lg transition-colors text-xs font-medium"
                    style={{
                      color: theme === 'dark' ? '#cbd5e1' : '#64748b'
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveHighlight} 
                    className="px-3.5 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors text-xs font-medium shadow-xs"
                  >
                    Highlight
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* View Note Popover */}
          <AnimatePresence>
            {viewingNote.visible && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed z-[100] shadow-2xl rounded-2xl p-4 border max-w-sm w-80"
                style={{ 
                  top: viewingNote.top + 10, 
                  left: viewingNote.left, 
                  transform: 'translateX(-50%)',
                  backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                  borderColor: theme === 'dark' ? '#334155' : '#e2e8f0',
                  color: theme === 'dark' ? '#f8fafc' : '#0f172a'
                }}
              >
                <div className="flex justify-between items-center mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Highlight Note</span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => deleteHighlight(viewingNote.id)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete Highlight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setViewingNote({ visible: false, note: '', top: 0, left: 0 })} 
                      className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors text-sm"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <div className="text-xs whitespace-pre-wrap leading-relaxed">
                  {viewingNote.note || <span className="italic text-slate-400">No note attached to this highlight.</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
