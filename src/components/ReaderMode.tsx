import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Type, Sun, Moon, ArrowLeft, ShieldAlert, Play, Pause, Square,
  Trash2, Clock, BookOpen, Volume2, Globe, SkipBack, SkipForward,
  Check, ChevronDown
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { Readability } from '@mozilla/readability';
import { detectLanguage, getBestVoice, getMacDefaultVoice, splitIntoSentences, NativeVoiceInfo, tts } from '../services/tts';
import { safeBase64 as safeBase64Util } from '../utils/securityUtils';
import { generateId } from '../utils/idGenerator';
import { getLocale } from '../services/i18n';
import { isSafeNavigationUrl } from '../utils/safeNavigation';

const safeBase64 = (str: string): string => {
  return safeBase64Util(str);
};

export interface HighlightData {
  id: string;
  text: string;
  color: string;
  note: string;
  path: string;
  offset: number;
}

export const READER_HIGHLIGHT_INJECT_DELAY_MS = 100;

export function highlightsStorageKey(url: string): string {
  return 'reader_highlights_' + safeBase64(url);
}

/**
 * The slice of a store read this loader uses: a `then` that can hand the value
 * to a handler, plus a `catch` for a failed read. In the app this is the IPC
 * promise from `storeGet`; the test hands in a thenable that settles on the
 * spot, so the generation contract is observable without waiting on a clock.
 */
export type HighlightStoreRead = {
  then: (onFulfilled: (saved: string | null | undefined) => void) => {
    catch: (onRejected: () => void) => void;
  };
};

export interface HighlightLoadOptions {
  /** The article currently on screen. */
  url: string;
  read: (storageKey: string) => HighlightStoreRead;
  /** Called synchronously on entry, for every article, saved or not. */
  onReset: () => void;
  onApply: (highlights: HighlightData[]) => void;
  /** Injects `<mark>` elements into the rendered article. */
  onInject: (highlights: HighlightData[]) => void;
  injectDelayMs?: number;
  /** Injectable clock; defaults to the real one. */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

/**
 * Loads one article's saved highlights as a cancellable generation, and returns
 * its cancel function.
 *
 * `ReaderMode` is not remounted on navigation — `App.tsx` only swaps the `url`
 * prop — so every piece of reader state survives a page change. Two things
 * followed from the old effect and are fixed here:
 *
 * - It reset nothing on entry. The storage read had no `else` branch, so an
 *   article with no saved highlights left the *previous* article's rows in
 *   state, and the next save wrote them under the new article's key.
 * - Nothing cancelled a slow read. A read for article A could resolve after
 *   article B had loaded, applying A's rows to B and injecting A's `<mark>`
 *   elements into B's DOM.
 *
 * The generation guard and the pending-injection cleanup below match the shape
 * the article-extraction effect in this file already uses.
 */
export function loadArticleHighlights(options: HighlightLoadOptions): () => void {
  const injectDelayMs = options.injectDelayMs ?? READER_HIGHLIGHT_INJECT_DELAY_MS;
  const schedule = options.setTimer ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const unschedule = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  let cancelled = false;
  let injectHandle: unknown = null;
  let injectPending = false;

  options.onReset();

  if (options.url) {
    options.read(highlightsStorageKey(options.url))
      .then((saved) => {
        if (cancelled || !saved) return;
        let parsed: HighlightData[];
        try {
          const raw = JSON.parse(saved);
          if (!Array.isArray(raw)) return;
          parsed = raw as HighlightData[];
        } catch (e) {
          console.error('Failed to parse highlights', e);
          return;
        }
        if (cancelled) return;
        options.onApply(parsed);
        injectPending = true;
        injectHandle = schedule(() => {
          if (cancelled) return;
          options.onInject(parsed);
        }, injectDelayMs);
      })
      .catch(() => {});
  }

  return () => {
    cancelled = true;
    if (injectPending) {
      injectPending = false;
      unschedule(injectHandle);
      injectHandle = null;
    }
  };
}

export function sanitizeReaderContent(content: string, isPrivate = false): string {
  return DOMPurify.sanitize(content, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target', 'rel', 'src', 'srcset', 'alt', 'title', 'href'],
      ADD_TAGS: ['figure', 'figcaption', 'picture', 'source', 'mark'],
      FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed', 'applet', 'svg', 'math', 'form', 'input', 'button', ...(isPrivate ? ['img', 'picture', 'source', 'audio', 'video'] : [])],
      FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style', 'color', 'bgcolor', 'background'],
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|data:image\/(?:png|jpe?g|webp|gif|avif|bmp|ico);base64,[a-z0-9+/=]+$|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
    });
}

export function handleReaderLink(event: React.MouseEvent<HTMLElement>, onNavigate?: (url: string) => void): void {
  if (event.button !== 0 && event.button !== 1) return;
  const link = (event.target as Element).closest?.('a[href]');
  if (!link) return;
  event.preventDefault();
  event.stopPropagation();
  const url = link.getAttribute('href') || '';
  if (/^https?:\/\//i.test(url) && isSafeNavigationUrl(url)) onNavigate?.(url);
}

export function persistArticleHighlights(url: string, highlights: HighlightData[], isPrivate: boolean,
  write: (key: string, value: string) => unknown): void {
  if (url && !isPrivate) write(highlightsStorageKey(url), JSON.stringify(highlights));
}

interface ReaderModeProps {
  url: string;
  tabId: string;
  isActive: boolean;
  onClose: () => void;
  isIncognito?: boolean;
  onNavigate?: (url: string) => void;
}

export const ReaderMode: React.FC<ReaderModeProps> = React.memo(({ url, tabId, isActive, onClose, isIncognito = false, onNavigate }) => {
  const [content, setContent] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [readingTime, setReadingTime] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const sanitizedContent = useMemo(() => {
    if (!content) return '';
    return sanitizeReaderContent(content, isIncognito);
  }, [content, isIncognito]);

  // Theme & Appearance with persistence
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_reader_theme');
      if (saved === 'light' || saved === 'dark' || saved === 'sepia') return saved;
      if (document.documentElement.classList.contains('dark') || window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'dark';
  });

  const [font, setFont] = useState<'sans' | 'serif' | 'mono'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_reader_font');
      if (saved === 'sans' || saved === 'serif' || saved === 'mono') return saved;
    }
    return 'sans';
  });

  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_reader_font_size');
      if (saved === 'sm' || saved === 'md' || saved === 'lg') return saved;
    }
    return 'md';
  });

  const [columnWidth, setColumnWidth] = useState<'narrow' | 'normal' | 'wide'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_reader_column_width');
      if (saved === 'narrow' || saved === 'normal' || saved === 'wide') return saved;
    }
    return 'normal';
  });

  const [showControls, setShowControls] = useState(false);

  // Native macOS & TTS State
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nova_reader_speech_rate');
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2.5) return parsed;
      }
    }
    return 1;
  });
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [sentences, setSentences] = useState<string[]>([]);
  const [detectedLang, setDetectedLang] = useState(() => getLocale());
  const [selectedLanguage, setSelectedLanguage] = useState<'auto' | 'tr-TR' | 'en-US' | 'de-DE' | 'fr-FR' | 'es-ES'>('auto');

  // Voices (Native OS + Web Speech)
  const [nativeVoices, setNativeVoices] = useState<NativeVoiceInfo[]>([]);
  const [webVoices, setWebVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>('');

  const contentRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const isPlayingRef = useRef(false);

  // Persist appearance settings
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'sepia') => {
    setTheme(newTheme);
    localStorage.setItem('nova_reader_theme', newTheme);
  };

  const handleFontChange = (newFont: 'sans' | 'serif' | 'mono') => {
    setFont(newFont);
    localStorage.setItem('nova_reader_font', newFont);
  };

  const handleFontSizeChange = (newSize: 'sm' | 'md' | 'lg') => {
    setFontSize(newSize);
    localStorage.setItem('nova_reader_font_size', newSize);
  };

  const handleColumnWidthChange = (newWidth: 'narrow' | 'normal' | 'wide') => {
    setColumnWidth(newWidth);
    localStorage.setItem('nova_reader_column_width', newWidth);
  };

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
  // Shown inside the highlight popover when the selection cannot be wrapped.
  const [highlightError, setHighlightError] = useState('');
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
      window.speechSynthesis.addEventListener('voiceschanged', updateWebVoices);
    }

    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.removeEventListener('voiceschanged', updateWebVoices);
      }
    };
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
    if (!content) return;
    if (isIncognito) { setHighlights([]); return; }

    return loadArticleHighlights({
      url,
      read: (storageKey) => (window as any).electronAPI?.storeGet(storageKey),
      // Keep the identity when it is already empty, so the unconditional reset
      // costs no extra render on first load.
      onReset: () => setHighlights(prev => (prev.length === 0 ? prev : [])),
      onApply: setHighlights,
      onInject: (parsed) => {
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
              span.style.backgroundColor = /^#[0-9a-fA-F]{3,8}$/.test(h.color || '') ? h.color : '#fef08a';
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
      },
    });
  }, [content, url, isIncognito]);

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
      setHighlightError('');
      setViewingNote({ visible: false, note: '', top: 0, left: 0 });
    };

    document.addEventListener('mouseup', handleSelectionChange);
    return () => document.removeEventListener('mouseup', handleSelectionChange);
  }, [content]);

  const saveHighlight = () => {
    if (!popoverState.range) return;
    setHighlightError('');

    const id = popoverState.existingId || generateId('hl');
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
      span.style.backgroundColor = /^#[0-9a-fA-F]{3,8}$/.test(highlightColor) ? highlightColor : '#fef08a';
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

      // surroundContents() throws InvalidStateError unless the range sits wholly
      // inside one Text node — i.e. for every selection that crosses a <b>, <a>,
      // <em> or a paragraph boundary, which is the common case in article prose.
      // extractContents() tolerates partial selections: the selected fragment is
      // lifted out, the mark is inserted in its place, and the fragment moved in.
      try {
        const range = popoverState.range;
        const fragment = range.extractContents();
        range.insertNode(span);
        span.appendChild(fragment);
      } catch (e) {
        console.warn('Could not highlight range:', e);
        // Undo a half-finished insert so the prose is not left inside an
        // untracked mark, then tell the user instead of failing silently.
        if (span.parentNode) {
          if (span.firstChild) {
            span.parentNode.replaceChild(document.createTextNode(span.textContent || ''), span);
          } else {
            span.parentNode.removeChild(span);
          }
        }
        setHighlightError('This selection could not be highlighted. Try a shorter, continuous passage.');
        return;
      }
    }

    setHighlights(updated);
    persistArticleHighlights(url, updated, isIncognito, (key, value) => (window as any).electronAPI?.storeSet(key, value));

    setPopoverState({ visible: false, top: 0, left: 0, text: '' });
    window.getSelection()?.removeAllRanges();
  };

  const deleteHighlight = (id?: string) => {
    const targetId = id || viewingNote.id;
    if (!targetId) return;

    const updated = highlights.filter(h => h.id !== targetId);
    setHighlights(updated);

    if (contentRef.current) {
      const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(targetId) : targetId.replace(/["\\]/g, '\\$&');
      const mark = contentRef.current.querySelector(`mark[data-id="${escapedId}"]`);
      if (mark && mark.parentNode) {
        const textNode = document.createTextNode(mark.textContent || '');
        mark.parentNode.replaceChild(textNode, mark);
      }
    }

    persistArticleHighlights(url, updated, isIncognito, (key, value) => (window as any).electronAPI?.storeSet(key, value));

    setViewingNote({ visible: false, note: '', top: 0, left: 0 });
  };

  const closePopover = () => {
    setPopoverState({ visible: false, top: 0, left: 0, text: '' });
    setHighlightError('');
  };

  // Extract sentences when content changes using smart Intl / regex sentence splitting
  useEffect(() => {
    if (contentRef.current) {
      // Defense in depth: enforce rel/target on rendered article links (tabnabbing) and purge non-safe schemes.
      contentRef.current.querySelectorAll('a').forEach((a) => {
        const href = a.getAttribute('href');
        if (href && !/^(?:https?|mailto|tel):/i.test(href)) {
          a.removeAttribute('href');
        } else {
          a.setAttribute('rel', 'noopener noreferrer');
          a.setAttribute('target', '_blank');
        }
      });
      const text = contentRef.current.innerText || title;
      const parsed = splitIntoSentences(text);
      setSentences(parsed);
      setCurrentSentenceIndex(0);

      // Detect language
      const lang = detectLanguage(text);
      setDetectedLang(lang);
    }
  }, [content, title]);

  // Speech lifecycle is anchored to isActive, i.e. to "this reader's tab is the
  // one in front". Leaving that tab (or unmounting) must stop narration,
  // otherwise TTS keeps reading the previous article over the next tab.
  // The cleanup covers the false -> true flip too, so a stale utterance can
  // never survive the transition back.
  // NOTE: deps must stay [isActive] — stopSpeech is re-created every render, so
  // listing it would re-run this effect (and stop speech) on every render.
  useEffect(() => {
    if (!isActive) {
      stopSpeech();
    }
    return () => {
      stopSpeech();
    };
  }, [isActive]);

  const readerSessionIdRef = useRef(0);

  const effectiveLanguage = selectedLanguage === 'auto' ? detectedLang : selectedLanguage;

  const speakSentence = async (index: number, rate: number = speechRate, targetSentences: string[] = sentences, sessionId: number = readerSessionIdRef.current) => {
    if (!isPlayingRef.current || sessionId !== readerSessionIdRef.current || index >= targetSentences.length) {
      isPlayingRef.current = false;
      setIsPlaying(false);
      setIsPaused(false);
      if (index >= targetSentences.length) {
        setCurrentSentenceIndex(0);
      }
      return;
    }

    const currentSentence = targetSentences[index];
    setCurrentSentenceIndex(index);

    // Check if macOS native TTS is available
    if (typeof window !== 'undefined' && (window as any).electronAPI?.nativeTtsSpeak) {
      const voice = selectedVoiceName || getMacDefaultVoice(effectiveLanguage);
      try {
        const res = await (window as any).electronAPI.nativeTtsSpeak(currentSentence, voice, rate, effectiveLanguage);
        if (!isPlayingRef.current || sessionId !== readerSessionIdRef.current) return;
        if (res && res.success) {
          const next = index + 1;
          if (next < targetSentences.length) {
            setCurrentSentenceIndex(next);
            setTimeout(() => {
              if (isPlayingRef.current && sessionId === readerSessionIdRef.current) {
                speakSentence(next, rate, targetSentences, sessionId);
              }
            }, 30);
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
        if (!isPlayingRef.current || sessionId !== readerSessionIdRef.current) return;
        const next = index + 1;
        if (next < targetSentences.length) {
          setCurrentSentenceIndex(next);
          setTimeout(() => {
            if (isPlayingRef.current && sessionId === readerSessionIdRef.current) {
              speakSentence(next, rate, targetSentences, sessionId);
            }
          }, 20);
        } else {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsPaused(false);
          setCurrentSentenceIndex(0);
        }
      };

      utterance.onerror = () => {
        if (sessionId === readerSessionIdRef.current) {
          isPlayingRef.current = false;
          setIsPlaying(false);
          setIsPaused(false);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleSpeech = () => {
    if (isPlaying) {
      stopSpeech();
      setIsPaused(true);
    } else {
      tts.stop();
      readerSessionIdRef.current++;
      const currentSession = readerSessionIdRef.current;

      let currentSentences = sentences;
      if (currentSentences.length === 0 && contentRef.current) {
        const text = contentRef.current.innerText || title || '';
        currentSentences = splitIntoSentences(text);
        setSentences(currentSentences);
      }

      if (currentSentences.length > 0) {
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsPaused(false);
        speakSentence(currentSentenceIndex, speechRate, currentSentences, currentSession);
      }
    }
  };

  const nextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      const next = currentSentenceIndex + 1;
      setCurrentSentenceIndex(next);
      if (isPlaying) {
        tts.stop();
        readerSessionIdRef.current++;
        speakSentence(next, speechRate, sentences, readerSessionIdRef.current);
      }
    }
  };

  const prevSentence = () => {
    if (currentSentenceIndex > 0) {
      const prev = currentSentenceIndex - 1;
      setCurrentSentenceIndex(prev);
      if (isPlaying) {
        tts.stop();
        readerSessionIdRef.current++;
        speakSentence(prev, speechRate, sentences, readerSessionIdRef.current);
      }
    }
  };

  const stopSpeech = () => {
    isPlayingRef.current = false;
    readerSessionIdRef.current++;
    tts.stop();
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIndex(0);
  };

  const changeSpeechRate = () => {
    const nextRate = speechRate === 1 ? 1.25 : speechRate === 1.25 ? 1.5 : speechRate === 1.5 ? 2 : 1;
    setSpeechRate(nextRate);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nova_reader_speech_rate', String(nextRate));
    }
    if (isPlaying) {
      tts.stop();
      readerSessionIdRef.current++;
      const currentSession = readerSessionIdRef.current;
      isPlayingRef.current = true;
      if ((window as any).electronAPI?.nativeTtsStop) (window as any).electronAPI.nativeTtsStop();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      speakSentence(currentSentenceIndex, nextRate, sentences, currentSession);
    }
  };

  useEffect(() => {
    if (!isActive) return;

    // Generation guard: tab switch / navigation / unmount flips `cancelled`, so a
    // slower earlier extraction can no longer resolve after a newer one and
    // overwrite the article on screen with the previous page's content.
    let cancelled = false;

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
        const MAX_READER_HTML_CHARS = 3 * 1024 * 1024;
        let html: any = '';
        const webview = document.querySelector(`webview[data-tab-id="${tabId}"]`) as any;
        if (webview && typeof webview.executeJavaScript === 'function') {
          try {
            html = await webview.executeJavaScript(`document.documentElement.outerHTML`);
            if (cancelled) return;
          } catch (e) {
            console.warn('ReaderMode webview.executeJavaScript failed, trying fallback', e);
          }
        }
        if (!html && (window as any).electronAPI?.fetchPageHtml) {
          try {
            const res = await (window as any).electronAPI.fetchPageHtml(url);
            if (cancelled) return;
            html = typeof res === 'string' ? res : (res?.html ?? '');
          } catch (e) {
            console.warn('ReaderMode fetchPageHtml fallback failed', e);
          }
        }
        if (cancelled) return;
        if (typeof html !== 'string') html = String(html ?? '');
        // Main-process fetch-page-html already caps sanitized output at 3MB;
        // cap the unbounded webview outerHTML path here as well.
        if (html.length > MAX_READER_HTML_CHARS) {
          console.warn(`ReaderMode HTML exceeds 3MB (${html.length} chars), truncating`);
          html = html.slice(0, MAX_READER_HTML_CHARS);
        }
        if (!html) throw new Error('Unable to extract article content from this page.');

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        if (cancelled) return;
        // Cooperative micro-yield after DOM parsing
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (cancelled) return;

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

        // Cooperative micro-yield before Readability
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (cancelled) return;

        const reader = new Readability(clonedDoc);
        const article = reader.parse();
        if (cancelled) return;

        // Cooperative micro-yield after Readability before sanitization
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        if (cancelled) return;

        if (article && article.content) {
          setTitle(article.title || '');
          setAuthor(article.byline || '');

          const textContent = article.textContent || '';
          const words = textContent.trim().split(/\s+/).filter(Boolean).length;
          setWordCount(words);
          setReadingTime(Math.max(1, Math.ceil(words / 200)));

          // Sanitize and strip hardcoded inline colors/backgrounds for true dark mode and security
          const rawCleanHtml = sanitizeReaderContent(article.content, isIncognito);
          // Harden links against tabnabbing using an inert DOMParser document (avoids innerHTML DOM preloads).
          const parsedDoc = new DOMParser().parseFromString(rawCleanHtml, 'text/html');
          parsedDoc.querySelectorAll('a').forEach((a) => {
            a.setAttribute('rel', 'noopener noreferrer');
            a.setAttribute('target', '_blank');
          });
          setContent(sanitizeReaderContent(parsedDoc.body.innerHTML, isIncognito));
        } else {
          setError('The text content on this page is not suitable for reader mode.');
        }
      } catch (err: any) {
        if (cancelled) return;
        setError(err.message || 'Page content could not be read.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    extractContent();
    return () => { cancelled = true; };
  }, [isActive, tabId, url, isIncognito]);

  const bgColors = {
    light: 'bg-[#fafafa] text-slate-900',
    dark: 'bg-slate-950 text-slate-100',
    sepia: 'bg-[#f6f0e2] text-[#4a3928]'
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
          role="dialog"
          aria-modal="true"
          aria-label="Reader Mode"
          className={`fixed inset-0 z-50 overflow-y-auto ${bgColors[theme]} ${fonts[font]}`}
        >
          {/* Custom style overrides to guarantee dark mode clean contrast without white background bleeding */}
          <style>{`
            .reader-content * {
              color: inherit !important;
              background-color: transparent !important;
              border-color: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : theme === 'sepia' ? 'rgba(91,70,54,0.15)' : 'rgba(0,0,0,0.1)'} !important;
            }
            .reader-content a {
              color: #06b6d4 !important;
              text-decoration: underline !important;
            }
            .reader-content pre, .reader-content code {
              background-color: ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : theme === 'sepia' ? 'rgba(91,70,54,0.1)' : 'rgba(0,0,0,0.06)'} !important;
              border-radius: 0.375rem;
              padding: 0.125rem 0.25rem;
            }
            .reader-content img {
              max-width: 100%;
              height: auto;
              border-radius: 0.75rem;
              margin: 1.5rem auto;
              display: block;
            }
            .reader-content blockquote {
              border-left: 2px solid currentColor;
              padding-left: 1rem;
              font-style: italic;
              opacity: 0.75;
            }
          `}</style>

          {/* Header Bar */}
          <div className={`sticky top-0 px-4 py-2.5 flex items-center justify-between backdrop-blur-md bg-opacity-90 border-b z-40 ${theme === 'dark' ? 'border-white/[0.08] bg-[#0e0f12]/90' : theme === 'sepia' ? 'border-amber-900/10 bg-[#f6f0e2]/90' : 'border-neutral-200/80 bg-white/90'}`}>
            <div className="flex items-center gap-2 no-drag">
              {isMac && <div className="w-[68px] shrink-0" />}
              <button
                type="button"
                onClick={onClose}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/[0.08] text-neutral-200' : 'hover:bg-black/5 text-neutral-800'}`}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Close
              </button>
            </div>

            <div className="relative flex items-center gap-1.5 no-drag" ref={controlsRef}>
              {/* Audio Read Aloud Quick Button */}
              <div className={`flex items-center gap-1 rounded-lg px-2 py-1 mr-1 no-drag border ${theme === 'dark' ? 'bg-white/[0.06] border-white/[0.08]' : 'bg-black/[0.04] border-black/[0.06]'}`}>
                <button
                  type="button"
                  onClick={toggleSpeech}
                  className={`p-1 rounded-md transition-colors no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/[0.1] text-neutral-100' : 'hover:bg-black/10 text-neutral-900'}`}
                  title={isPlaying ? 'Pause' : 'Read Aloud with Natural Voice'}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                </button>
                {(isPlaying || isPaused) && (
                  <button
                    type="button"
                    onClick={stopSpeech}
                    className={`p-1 rounded-md transition-colors text-red-500 no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/[0.1]' : 'hover:bg-black/10'}`}
                    title="Stop"
                  >
                    <Square className="w-3 h-3 fill-current" />
                  </button>
                )}
                <div className={`h-3.5 w-px mx-0.5 ${theme === 'dark' ? 'bg-white/[0.12]' : 'bg-black/15'}`} />
                <button
                  type="button"
                  onClick={changeSpeechRate}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-colors text-[11px] font-mono font-semibold w-9 justify-center no-drag cursor-pointer ${theme === 'dark' ? 'hover:bg-white/[0.1] text-neutral-200' : 'hover:bg-black/10 text-neutral-800'}`}
                  title="Reading Speed"
                >
                  {speechRate}x
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowControls(!showControls)}
                className={`p-1.5 rounded-lg transition-colors no-drag cursor-pointer ${
                  showControls
                    ? theme === 'dark'
                      ? 'bg-white text-neutral-950'
                      : 'bg-neutral-900 text-white'
                    : theme === 'dark'
                    ? 'hover:bg-white/[0.08] text-neutral-200'
                    : 'hover:bg-black/5 text-neutral-800'
                }`}
                title="Appearance & Voice Settings"
              >
                <Type className="w-4 h-4" />
              </button>

              {showControls && (
                <div className={`absolute top-full right-0 mt-2 p-4 rounded-xl shadow-2xl border flex flex-col gap-4 min-w-[300px] z-[100] no-drag ${theme === 'dark' ? 'bg-[#141518] border-white/[0.1] text-neutral-100' : theme === 'sepia' ? 'bg-[#fdf8ee] border-amber-900/15 text-[#4a3928]' : 'bg-white border-neutral-200/90 text-neutral-900'}`}>
                  {/* Theme */}
                  <div>
                    <div className="text-[10px] font-semibold opacity-55 mb-2 tracking-wider uppercase">Theme</div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => handleThemeChange('light')} className={`flex-1 p-2 rounded-lg border transition-colors no-drag cursor-pointer flex items-center justify-center ${theme === 'light' ? 'border-neutral-900 ring-1 ring-neutral-900' : 'border-neutral-200'} bg-white text-neutral-900`} title="Light Theme"><Sun className="w-4 h-4" /></button>
                      <button type="button" onClick={() => handleThemeChange('sepia')} className={`flex-1 p-2 rounded-lg border transition-colors no-drag cursor-pointer flex items-center justify-center ${theme === 'sepia' ? 'border-amber-700 ring-1 ring-amber-700' : 'border-amber-200'} bg-[#f4ecd8] text-amber-900 font-serif font-bold text-base`} title="Sepia Theme">A</button>
                      <button type="button" onClick={() => handleThemeChange('dark')} className={`flex-1 p-2 rounded-lg border transition-colors no-drag cursor-pointer flex items-center justify-center ${theme === 'dark' ? 'border-white ring-1 ring-white' : 'border-neutral-700'} bg-[#0e0f12] text-white`} title="Dark OLED Theme"><Moon className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {/* Font */}
                  <div>
                    <div className="text-[10px] font-semibold opacity-55 mb-2 tracking-wider uppercase">Typeface</div>
                    <div className="flex gap-1.5">
                      {(['sans', 'serif', 'mono'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => handleFontChange(f)}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs transition-colors no-drag cursor-pointer ${
                            f === 'sans' ? 'font-sans' : f === 'serif' ? 'font-serif' : 'font-mono'
                          } ${
                            font === f
                              ? theme === 'dark'
                                ? 'bg-white text-neutral-950 border-transparent font-medium'
                                : 'bg-neutral-900 text-white border-transparent font-medium'
                              : theme === 'dark'
                              ? 'border-white/[0.1] hover:bg-white/[0.06]'
                              : 'border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {f === 'sans' ? 'Modern' : f === 'serif' ? 'Classic' : 'Mono'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Font Size */}
                  <div>
                    <div className="text-[10px] font-semibold opacity-55 mb-2 tracking-wider uppercase">Text Size</div>
                    <div className="flex gap-1.5 items-center">
                      {([
                        { id: 'sm', label: 'A-', cls: 'text-xs' },
                        { id: 'md', label: 'A', cls: 'text-sm font-medium' },
                        { id: 'lg', label: 'A+', cls: 'text-base font-semibold' },
                      ] as const).map((sz) => (
                        <button
                          key={sz.id}
                          type="button"
                          onClick={() => handleFontSizeChange(sz.id)}
                          className={`flex-1 py-1.5 rounded-lg border transition-colors no-drag cursor-pointer ${sz.cls} ${
                            fontSize === sz.id
                              ? theme === 'dark'
                                ? 'bg-white text-neutral-950 border-transparent'
                                : 'bg-neutral-900 text-white border-transparent'
                              : theme === 'dark'
                              ? 'border-white/[0.1] hover:bg-white/[0.06]'
                              : 'border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {sz.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Column Width */}
                  <div>
                    <div className="text-[10px] font-semibold opacity-55 mb-2 tracking-wider uppercase">Column Width</div>
                    <div className="flex gap-1.5">
                      {(['narrow', 'normal', 'wide'] as const).map((cw) => (
                        <button
                          key={cw}
                          type="button"
                          onClick={() => handleColumnWidthChange(cw)}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-xs capitalize transition-colors no-drag cursor-pointer ${
                            columnWidth === cw
                              ? theme === 'dark'
                                ? 'bg-white text-neutral-950 border-transparent font-medium'
                                : 'bg-neutral-900 text-white border-transparent font-medium'
                              : theme === 'dark'
                              ? 'border-white/[0.1] hover:bg-white/[0.06]'
                              : 'border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          {cw}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Natural Voice & Language Settings */}
                  <div className={`border-t pt-3.5 ${theme === 'dark' ? 'border-white/[0.08]' : 'border-neutral-200/80'}`}>
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold opacity-55 mb-2.5 tracking-wider uppercase">
                      <Volume2 className="w-3.5 h-3.5" /> Natural Voice & Audio
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium opacity-75 flex items-center gap-1">
                          <Globe className="w-3 h-3" /> Language
                        </span>
                        <select
                          value={selectedLanguage}
                          onChange={(e) => {
                            setSelectedLanguage(e.target.value as any);
                            setSelectedVoiceName('');
                          }}
                          className={`text-xs px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                            theme === 'dark' ? 'bg-white/[0.06] border-white/[0.1] text-neutral-200' : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                          }`}
                        >
                          <option value="auto">Auto ({detectedLang.startsWith('tr') ? 'Turkish' : detectedLang.startsWith('de') ? 'German' : detectedLang.startsWith('fr') ? 'French' : detectedLang.startsWith('es') ? 'Spanish' : 'English'})</option>
                          <option value="tr-TR">Turkish (Yelda / Natural)</option>
                          <option value="en-US">English (Samantha / Natural)</option>
                          <option value="de-DE">German (Anna)</option>
                          <option value="fr-FR">French (Thomas)</option>
                          <option value="es-ES">Spanish (Mónica)</option>
                        </select>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium opacity-75 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Voice
                        </span>
                        <select
                          value={selectedVoiceName}
                          onChange={(e) => setSelectedVoiceName(e.target.value)}
                          className={`text-xs px-2.5 py-1 rounded-lg border outline-none cursor-pointer max-w-[180px] truncate ${
                            theme === 'dark' ? 'bg-white/[0.06] border-white/[0.1] text-neutral-200' : 'bg-neutral-100 border-neutral-200 text-neutral-800'
                          }`}
                        >
                          <option value="">
                            {isMac ? (effectiveLanguage.startsWith('tr') ? 'Yelda (Apple Natural)' : 'Samantha (Apple Natural)') : 'Best Natural Voice'}
                          </option>

                          {activeNativeVoices.length > 0 && (
                            <optgroup label="macOS System Voices">
                              {activeNativeVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                  {v.name}
                                </option>
                              ))}
                            </optgroup>
                          )}

                          {activeWebVoices.length > 0 && activeNativeVoices.length === 0 && (
                            <optgroup label="Installed Voices">
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

          <div className={`${columnWidths[columnWidth]} mx-auto px-6 py-12 pb-36 transition-all duration-300`}>
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 opacity-60">
                <div className="w-6 h-6 border-2 border-current/20 border-t-current rounded-full animate-spin mb-3" />
                <p className="text-xs font-medium">Extracting article content...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-20 text-red-500">
                <ShieldAlert className="w-10 h-10 mx-auto mb-3 opacity-60" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {content && !isLoading && !error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={sizes[fontSize]}>
                <h1 className="text-3xl md:text-5xl font-bold mb-4 leading-tight tracking-tight">{title}</h1>

                {/* Article Metadata Bar */}
                <div className="flex flex-wrap items-center gap-4 text-xs opacity-65 mb-8 border-b pb-4 border-current/10">
                  {author && <span className="font-semibold uppercase tracking-wider">{author}</span>}
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {readingTime} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5" />
                    {wordCount.toLocaleString()} words
                  </span>
                  <span className="flex items-center gap-1 font-medium">
                    <Volume2 className="w-3.5 h-3.5" />
                    {isMac ? (effectiveLanguage.startsWith('tr') ? 'macOS Yelda Natural Voice' : 'macOS Samantha Natural Voice') : 'Natural Human Voice'}
                  </span>
                </div>

                {isIncognito && <p className="mb-4 text-xs opacity-70">Private reading: highlights stay in memory. Images are hidden to keep your normal session separate.</p>}
                <div
                  ref={contentRef}
                  onClick={event => handleReaderLink(event, onNavigate)}
                  onAuxClick={event => handleReaderLink(event, onNavigate)}
                  onContextMenu={event => {
                    if (isIncognito && (event.target as Element).closest?.('a')) event.preventDefault();
                  }}
                  className={`reader-content prose prose-lg max-w-none prose-a:underline prose-a:decoration-current/40 hover:prose-a:decoration-current prose-img:rounded-xl prose-headings:font-bold ${theme === 'dark' ? 'prose-invert' : ''}`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizedContent
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Floating Bottom Audio Player */}
          <AnimatePresence>
            {(isPlaying || isPaused) && sentences.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ duration: 0.16, ease: 'easeOut' }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] backdrop-blur-xl rounded-xl shadow-2xl border p-3.5 flex flex-col gap-2.5 no-drag"
                style={{
                  backgroundColor: theme === 'dark' ? 'rgba(20, 21, 24, 0.96)' : theme === 'sepia' ? 'rgba(246, 240, 226, 0.96)' : 'rgba(255, 255, 255, 0.96)',
                  borderColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : theme === 'sepia' ? 'rgba(91, 70, 54, 0.15)' : 'rgba(0, 0, 0, 0.1)',
                  color: theme === 'dark' ? '#f5f5f5' : theme === 'sepia' ? '#4a3928' : '#171717'
                }}
              >
                <div className="flex items-center justify-between text-xs font-medium px-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    <span className="font-semibold">
                      {isPlaying ? 'Reading Aloud' : 'Paused'}
                    </span>
                    <span className="opacity-55 text-[11px] font-mono tabular-nums">
                      ({currentSentenceIndex + 1} / {sentences.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] opacity-65 truncate max-w-[140px]">
                      {selectedVoiceName || (isMac ? (effectiveLanguage.startsWith('tr') ? 'Yelda' : 'Samantha') : 'Natural Voice')}
                    </span>
                    <button
                      type="button"
                      onClick={changeSpeechRate}
                      className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-current/10 hover:bg-current/15 transition-colors cursor-pointer"
                    >
                      {speechRate}x
                    </button>
                  </div>
                </div>

                <div className="text-xs px-3 py-2 rounded-lg bg-black/5 dark:bg-white/[0.04] line-clamp-2 italic leading-relaxed opacity-85 border border-black/5 dark:border-white/[0.06]">
                  &ldquo;{sentences[currentSentenceIndex] || '...'}&rdquo;
                </div>

                <div className="w-full bg-black/10 dark:bg-white/10 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-current h-full transition-all duration-300 rounded-full"
                    style={{ width: `${((currentSentenceIndex + 1) / Math.max(1, sentences.length)) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={prevSentence}
                      disabled={currentSentenceIndex <= 0}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Previous Sentence"
                    >
                      <SkipBack className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleSpeech}
                      className={`p-2 rounded-lg font-medium transition-colors active:scale-95 cursor-pointer ${
                        theme === 'dark' ? 'bg-white text-neutral-950 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                      title={isPlaying ? 'Pause' : 'Resume'}
                    >
                      {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={nextSentence}
                      disabled={currentSentenceIndex >= sentences.length - 1}
                      className="p-1.5 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 transition-colors cursor-pointer"
                      title="Next Sentence"
                    >
                      <SkipForward className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={stopSpeech}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Stop Reading"
                  >
                    <Square className="w-3 h-3 fill-current" />
                    <span>Stop</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Highlight Creation Popover */}
          <AnimatePresence>
            {popoverState.visible && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                className="fixed z-[100] shadow-2xl rounded-xl p-3.5 border w-72 text-sm"
                style={{
                  top: Math.max(10, popoverState.top - 10),
                  left: popoverState.left,
                  transform: 'translate(-50%, -100%)',
                  backgroundColor: theme === 'dark' ? '#141518' : '#ffffff',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e5e5',
                  color: theme === 'dark' ? '#f5f5f5' : '#171717'
                }}
                onMouseDown={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-55">Color</span>
                  <div className="flex gap-2">
                    {highlightColors.map(c => (
                      <button
                        type="button"
                        key={c.name}
                        onClick={() => setHighlightColor(c.hex)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${highlightColor === c.hex ? (theme === 'dark' ? 'border-white scale-110' : 'border-neutral-900 scale-110') : 'border-transparent'}`}
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
                  className="w-full h-20 p-2.5 rounded-lg mb-2.5 resize-none outline-none border text-xs transition-colors"
                  style={{
                    backgroundColor: theme === 'dark' ? '#0e0f12' : '#fafafa',
                    borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e5e5',
                    color: theme === 'dark' ? '#f5f5f5' : '#171717'
                  }}
                />
                {highlightError && (
                  <p
                    role="alert"
                    className="mb-2.5 rounded-lg px-2.5 py-2 text-[11px] font-medium leading-snug"
                    style={{
                      backgroundColor: theme === 'dark' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                      color: theme === 'dark' ? '#fca5a5' : '#b91c1c'
                    }}
                  >
                    {highlightError}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closePopover}
                    className="px-3 py-1.5 rounded-lg transition-colors text-xs font-medium cursor-pointer"
                    style={{
                      color: theme === 'dark' ? '#a3a3a3' : '#525252'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveHighlight}
                    className={`px-3.5 py-1.5 rounded-lg transition-colors text-xs font-medium cursor-pointer ${
                      theme === 'dark' ? 'bg-white text-neutral-950 hover:bg-neutral-200' : 'bg-neutral-900 text-white hover:bg-neutral-800'
                    }`}
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
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="fixed z-[100] shadow-2xl rounded-xl p-3.5 border max-w-sm w-80"
                style={{
                  top: viewingNote.top + 10,
                  left: viewingNote.left,
                  transform: 'translateX(-50%)',
                  backgroundColor: theme === 'dark' ? '#141518' : '#ffffff',
                  borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : '#e5e5e5',
                  color: theme === 'dark' ? '#f5f5f5' : '#171717'
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider opacity-55">Highlight Note</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => deleteHighlight(viewingNote.id)}
                      className="p-1 rounded-md text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete Highlight"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewingNote({ visible: false, note: '', top: 0, left: 0 })}
                      className="p-1 rounded-md opacity-60 hover:opacity-100 transition-opacity text-sm cursor-pointer"
                    >
                      &times;
                    </button>
                  </div>
                </div>
                <div className="text-xs whitespace-pre-wrap leading-relaxed">
                  {viewingNote.note || <span className="italic opacity-60">No note attached to this highlight.</span>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
});
