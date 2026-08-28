import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Brain, Trash2, Plus, Loader2, RefreshCw, Volume2, VolumeX, Mic, MicOff, Square, ShieldAlert, Check, Paperclip, Copy, FileText, Wrench, AlertCircle, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAgent, AVAILABLE_AI_MODELS, AiError, AgentStatus, ChatAttachments } from '../services/aiAgent';
import { aiMemory, MemoryItem, TaskSummary } from '../services/aiMemory';
import { tts } from '../services/tts';
import { orchestrator, QueuedAction } from '../services/agentOrchestrator';
import { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  isDemo?: boolean;
}

/** Image waiting to be sent with the next chat turn (data URL form). */
interface PendingImageAttachment {
  id: string;
  name: string;
  dataUrl: string;
}

/** Text file waiting to be sent with the next chat turn. */
interface PendingFileAttachment {
  id: string;
  name: string;
  text: string;
}

const MAX_PENDING_IMAGES = 4;
const MAX_PENDING_FILES = 4;
/** Text files larger than this are rejected outright. */
const MAX_TEXT_FILE_BYTES = 256 * 1024;
/** Read-time truncation budget; the engine truncates further per file. */
const TEXT_FILE_READ_CAP_CHARS = 200 * 1024;

const ATTACH_INPUT_ACCEPT = 'image/*,.txt,.md,.json,.csv,.js,.ts,.html,.css,.xml,.yml,.yaml';

const isImageFile = (file: File) =>
  file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);

const isTextFile = (file: File) =>
  file.type.startsWith('text/') || /\.(txt|md|json|csv|js|ts|html|css|xml|yml|yaml)$/i.test(file.name);

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsText(file);
  });

export const SidePanel = React.memo(({ 
  isOpen, 
  onClose,
  isDemo: demoMode = false,
}: SidePanelProps) => {
  const isDemo = demoMode || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true');
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>(() => {
    if (isDemo) {
      return [
        { role: 'user', content: 'Summarize this page locally. What should I know?' },
        { role: 'assistant', content: '**Here is the local summary.**\n\nNova Browser keeps the current page context on your device while Nova AI extracts the key points.\n\n- **Local WebGPU inference** — no cloud model request.\n- **Current-tab context** — summarize without leaving the browser.\n- **Private by design** — your prompt and page context stay local.' }
      ];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [selectedModelId, setSelectedModelId] = useState<string>(() => aiAgent.getModel());
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(isDemo);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showMemoryVault, setShowMemoryVault] = useState(false);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [tasks, setTasks] = useState<TaskSummary[]>([]);
  const [vaultTab, setVaultTab] = useState<'memory' | 'tasks'>('memory');
  const [newFact, setNewFact] = useState('');
  const [initError, setInitError] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [queuedActions, setQueuedActions] = useState<QueuedAction[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>({ state: 'idle' });
  const [pendingImages, setPendingImages] = useState<PendingImageAttachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<PendingFileAttachment[]>([]);
  const [attachmentHint, setAttachmentHint] = useState('');
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentIdRef = useRef(0);
  const attachmentHintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpeechRecognition = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(actions => {
      setQueuedActions(actions);
      
      // Auto-clear completed/failed/denied actions after 3 seconds to prevent memory leak
      const completedActions = actions.filter(a => a.state === 'completed' || a.state === 'failed' || a.state === 'denied');
      if (completedActions.length > 50) {
        // Remove only terminal actions — clearQueue() would also wipe executing
        // actions, making their subsequent updateActionState calls no-ops.
        orchestrator.pruneCompleted();
      }
    });
    return () => { unsubscribe(); };
  }, []);

  // Global agent lifecycle status; onStatus() emits the current state
  // immediately on subscribe and returns the unsubscribe function.
  useEffect(() => {
    return aiAgent.onStatus(setAgentStatus);
  }, []);

  // Initialize SpeechRecognition with proper lifecycle cleanup
  useEffect(() => {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      try {
        const rec = new SpeechRecognitionClass();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setInput(prev => (prev ? prev + ' ' : '') + finalTranscript);
          }
        };
        rec.onerror = () => setIsListening(false);
        rec.onend = () => setIsListening(false);

        recognitionRef.current = rec;
      } catch (err) {
        console.error('Failed to initialize SpeechRecognition:', err);
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current = null;
      }
    };
  }, []);

  // Push-to-Talk Handlers
  const handleMouseDownMic = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e) { console.error(e); }
  }, []);

  const handleMouseUpMic = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (e) { console.error(e); }
  }, []);

  // Subscribe to TTS state changes
  useEffect(() => {
    return tts.subscribe(setIsSpeaking);
  }, []);

  // -----------------------------------------------------------------------
  // Attachments: picker / drag & drop / paste share one processing path.
  // -----------------------------------------------------------------------

  // Transient inline hint (panel has no global toast system)
  const showAttachmentHint = useCallback((message: string) => {
    setAttachmentHint(message);
    if (attachmentHintTimerRef.current) clearTimeout(attachmentHintTimerRef.current);
    attachmentHintTimerRef.current = setTimeout(() => {
      attachmentHintTimerRef.current = null;
      setAttachmentHint('');
    }, 3000);
  }, []);

  useEffect(() => () => {
    if (attachmentHintTimerRef.current) clearTimeout(attachmentHintTimerRef.current);
  }, []);

  const addFilesToAttachments = useCallback(async (incoming: FileList | File[]) => {
    const files = Array.from(incoming);
    if (files.length === 0) return;
    const skipped: string[] = [];

    const imageCandidates = files.filter(isImageFile);
    const textCandidates = files.filter(f => !imageCandidates.includes(f) && isTextFile(f));
    const unsupported = files.filter(f => !imageCandidates.includes(f) && !textCandidates.includes(f));
    if (unsupported.length > 0) {
      skipped.push(`Unsupported file type: ${unsupported[0].name}`);
    }

    // Enforce pending caps; accept what fits and tell the user about the rest
    const imageSlots = Math.max(0, MAX_PENDING_IMAGES - pendingImages.length);
    const acceptedImages = imageCandidates.slice(0, imageSlots);
    if (imageCandidates.length > acceptedImages.length) {
      skipped.push(`Maximum ${MAX_PENDING_IMAGES} images allowed`);
    }

    const sizedTextFiles = textCandidates.filter(f => f.size <= MAX_TEXT_FILE_BYTES);
    if (sizedTextFiles.length < textCandidates.length) {
      skipped.push('Files larger than 256 KB were skipped');
    }
    const fileSlots = Math.max(0, MAX_PENDING_FILES - pendingFiles.length);
    const acceptedFiles = sizedTextFiles.slice(0, fileSlots);
    if (sizedTextFiles.length > acceptedFiles.length) {
      skipped.push(`Maximum ${MAX_PENDING_FILES} files allowed`);
    }

    let readFailures = 0;
    const newImages: PendingImageAttachment[] = [];
    for (const file of acceptedImages) {
      try {
        newImages.push({
          id: `img-${attachmentIdRef.current++}`,
          name: file.name,
          dataUrl: await readFileAsDataUrl(file),
        });
      } catch (err) {
        console.error('[SidePanel] Image read failed:', file.name, err);
        readFailures++;
      }
    }

    const newFiles: PendingFileAttachment[] = [];
    for (const file of acceptedFiles) {
      try {
        newFiles.push({
          id: `file-${attachmentIdRef.current++}`,
          name: file.name,
          text: (await readFileAsText(file)).slice(0, TEXT_FILE_READ_CAP_CHARS),
        });
      } catch (err) {
        console.error('[SidePanel] File read failed:', file.name, err);
        readFailures++;
      }
    }
    if (readFailures > 0) skipped.push('Failed to read some files');

    if (newImages.length > 0) setPendingImages(prev => [...prev, ...newImages]);
    if (newFiles.length > 0) setPendingFiles(prev => [...prev, ...newFiles]);
    if (skipped.length > 0) showAttachmentHint(skipped.slice(0, 2).join(' · '));
  }, [pendingImages.length, pendingFiles.length, showAttachmentHint]);

  // Ref mirror so the window-level paste listener always calls the latest
  // closure without re-registering on every attachment change.
  const addFilesRef = useRef(addFilesToAttachments);
  addFilesRef.current = addFilesToAttachments;

  // Paste images from the clipboard; plain text paste stays untouched.
  useEffect(() => {
    if (!isOpen || !isReady) return;
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (!files || files.length === 0) return;
      if (!Array.from(files).some(f => f.type.startsWith('image/'))) return;
      e.preventDefault();
      addFilesRef.current(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, isReady]);

  const removePendingImage = useCallback((id: string) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  }, []);

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // Only scroll into view when messages change, or when streaming chunk arrives
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingText]);

  useEffect(() => {
    if (showMemoryVault) {
      setMemories(aiMemory.getMemories());
      setTasks(aiMemory.getTaskHistory());
    }
  }, [showMemoryVault]);

  const handleInit = useCallback(async () => {
    if (isReady || isInitializing) return;
    setIsInitializing(true);
    setInitError('');
    try {
      await aiAgent.init((p, text) => {
        setProgress(p);
        setProgressText(text);
      });
      setIsReady(true);
      setMessages([{ role: 'assistant', content: 'Hello! I am ready to control your browser, analyze pages, or answer your questions. What would you like me to do?' }]);
    } catch (err: any) {
      console.error(err);
      setInitError('Failed to initialize AI engine. Please try again.');
      setProgressText('Initialization failed.');
    } finally {
      setIsInitializing(false);
    }
  }, [isReady, isInitializing]);

  const handleClearAICache = async () => {
    if (!window.confirm('Clear downloaded AI models and temporary cache to free up disk space?')) return;
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await window.caches.keys();
        for (const k of keys) {
          await window.caches.delete(k);
        }
      }
      if ((window as any).electronAPI?.clearAiModelsCache) {
        await (window as any).electronAPI.clearAiModelsCache();
      }
      setMessages([{ role: 'assistant', content: 'AI model cache and temporary files were successfully deleted from your computer.' }]);
      setIsReady(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAIAction = async (text: string, attachments?: ChatAttachments) => {
    const hasAttachments = Boolean(
      attachments && ((attachments.images?.length ?? 0) > 0 || (attachments.files?.length ?? 0) > 0)
    );
    if ((!text.trim() && !hasAttachments) || isLoading) return;

    // Attachment-only turns still need visible content in the user bubble
    let userContent = text;
    if (!userContent.trim() && hasAttachments) {
      const kinds = [
        ...((attachments!.images?.length ?? 0) > 0 ? ['image'] : []),
        ...((attachments!.files?.length ?? 0) > 0 ? ['file'] : []),
      ];
      userContent = `(attached ${kinds.join(' and ')})`;
    }

    const userMsg: ChatCompletionMessageParam = { role: 'user', content: userContent };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsLoading(true);
    setStreamingText('');

    try {
      if (!aiAgent.isReady()) {
        await handleInit();
      }

      if (!aiAgent.isReady()) {
        setMessages([...newMessages, { role: 'assistant', content: 'AI engine not initialized. Please click the "Start AI" button.' }]);
        return;
      }

      let streamedSoFar = '';
      let lastRenderTime = 0;
      const THROTTLE_MS = 80; // Only update UI max ~12 times a second to prevent React freezing

      const updatedMessages = await aiAgent.chat(newMessages, (chunk) => {
        streamedSoFar += chunk;
        const now = performance.now();
        if (now - lastRenderTime > THROTTLE_MS) {
          setStreamingText(streamedSoFar);
          lastRenderTime = now;
        }
      }, attachments);

      setStreamingText('');
      setMessages(updatedMessages.filter(m => m.role !== 'tool'));
      setMemories(aiMemory.getMemories());
      // Chips are cleared only on success so a failed turn can be retried
      if (attachments) {
        setPendingImages([]);
        setPendingFiles([]);
      }
    } catch (err: any) {
      console.error('[AI Chat Error]', err);
      const rawMsg = err?.message ?? err?.toString() ?? '';
      let errMsg: string;
      if (err instanceof AiError && err.code === 'vision_required') {
        errMsg = 'Images could not be processed: selected model does not support visual content. Select "Phi 3.5 Vision" from the model list to analyze images.';
      } else if (rawMsg.includes('Engine not initialized')) {
        errMsg = 'AI engine is not loaded yet. Please click the "Start AI" button first.';
      } else if (rawMsg.includes('ContentTypeError')) {
        errMsg = 'Message format error occurred. Please reset the chat and try again.';
      } else if (rawMsg) {
        errMsg = `Error: ${rawMsg}`;
      } else {
        errMsg = 'An unknown error occurred. Check the console.';
      }
      setMessages([...newMessages, { role: 'assistant', content: errMsg }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPendingAttachments = pendingImages.length > 0 || pendingFiles.length > 0;
    if ((!input.trim() && !hasPendingAttachments) || isLoading) return;
    const currentInput = input;
    const images = pendingImages.map(img => img.dataUrl);
    const files = pendingFiles.map(f => ({ name: f.name, text: f.text }));
    setInput('');
    await handleAIAction(currentInput, hasPendingAttachments ? { images, files } : undefined);
  };

  const handleStop = useCallback(() => {
    aiAgent.interrupt();
    tts.stop();
    orchestrator.clearQueue();
    setIsLoading(false);
    setStreamingText('');
  }, []);

  const handleAIActionRef = useRef(handleAIAction);
  handleAIActionRef.current = handleAIAction;

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Tracks the deferred quick-action dispatch so it can be cancelled if the
  // panel unmounts within the 300ms window (prevents a post-unmount setState).
  const quickActionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const actionText = customEvent.detail;
      if (actionText) {
        if (!isOpenRef.current) {
          // Tell App.tsx to open SidePanel via a new event, or we need App.tsx to listen and open it!
          window.dispatchEvent(new CustomEvent('open-ai-sidepanel'));
        }
        if (quickActionTimerRef.current !== null) {
          clearTimeout(quickActionTimerRef.current);
        }
        quickActionTimerRef.current = setTimeout(() => {
          quickActionTimerRef.current = null;
          handleAIActionRef.current(actionText);
        }, 300);
      }
    };
    window.addEventListener('ai-quick-action', handleQuickAction);
    return () => {
      window.removeEventListener('ai-quick-action', handleQuickAction);
      if (quickActionTimerRef.current !== null) {
        clearTimeout(quickActionTimerRef.current);
        quickActionTimerRef.current = null;
      }
    };
  }, []);

  // Whether the selected model can ingest image content parts (drives the
  // inline hint under pending image chips; sending is never blocked here —
  // the engine throws the typed AiError instead).
  const selectedModelSupportsVision = Boolean(
    AVAILABLE_AI_MODELS.find(m => m.id === selectedModelId)?.vision
  );

  // Global agent status pill content (Feature: single state line above input)
  const statusPill: { icon: React.ReactNode; label: string; detail?: string; classes: string } | null = (() => {
    switch (agentStatus.state) {
      case 'loading_model':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400 flex-shrink-0" />,
          label: 'Loading model',
          detail: agentStatus.detail,
          classes: 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300',
        };
      case 'thinking':
        return {
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400 flex-shrink-0" />,
          label: 'Thinking…',
          classes: 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300',
        };
      case 'acting':
        return {
          icon: <Wrench className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />,
          label: 'Executing action',
          detail: agentStatus.detail,
          classes: 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300',
        };
      case 'waiting_approval':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />,
          label: 'Waiting for approval',
          classes: 'bg-amber-50 dark:bg-amber-900/10 border-amber-300 dark:border-amber-500/40 text-amber-600 dark:text-amber-400',
        };
      case 'error':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />,
          label: agentStatus.detail || 'An error occurred',
          classes: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400',
        };
      default:
        return null;
    }
  })();

  // Download % parsed from the loading detail ("42% Fetching..."); null when
  // not trivially parseable, in which case no progress bar is rendered.
  const loadProgressPct = agentStatus.state === 'loading_model'
    ? (() => {
        const match = agentStatus.detail?.match(/(\d+)%/);
        if (!match) return null;
        return Math.min(100, Math.max(0, parseInt(match[1], 10)));
      })()
    : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="absolute top-0 right-0 bottom-0 w-88 sm:w-96 border-l border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#151122]/98 backdrop-blur-2xl flex flex-col h-full z-40 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] backdrop-blur-md">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-sm">Browser AI</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowMemoryVault(!showMemoryVault)}
                className={`p-1.5 rounded-lg transition-colors ${showMemoryVault ? 'bg-accent/20 dark:bg-accent-dark/50 text-accent-hover' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                title="AI Persistent Memory Panel"
              >
                <Brain className="w-4 h-4" />
              </button>
              {isReady && messages.length > 0 && !isLoading && (
                <button
                  onClick={() => setMessages([{ role: 'assistant', content: 'Chat reset. How can I help you?' }])}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Reset Chat"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {!isLoading && (
                <button
                  onClick={handleClearAICache}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
                  title="Purge Downloaded AI Cache & Free Disk Space"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              {isSpeaking ? (
                <button
                  onClick={() => tts.stop()}
                  className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 animate-pulse transition-colors"
                  title="Stop Reading"
                >
                  <VolumeX className="w-4 h-4" />
                </button>
              ) : null}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div
            className={`flex-1 overflow-y-auto p-4 flex flex-col gap-4 transition-colors ${
              isDraggingFiles && isReady && !showMemoryVault ? 'ring-2 ring-inset ring-cyan-400 bg-cyan-50/50 dark:bg-cyan-500/5 rounded-xl' : ''
            }`}
            onDragOver={(e) => {
              if (!isReady || showMemoryVault) return;
              e.preventDefault();
              setIsDraggingFiles(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                setIsDraggingFiles(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingFiles(false);
              if (!isReady || showMemoryVault) return;
              if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
                addFilesToAttachments(e.dataTransfer.files);
              }
            }}
          >
            {/* Memory Vault Overlay */}
            {showMemoryVault ? (
              <div className="flex-1 flex flex-col overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Brain className="w-4 h-4 text-accent" /> AI Memory Vault
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">What the AI has learned and done</p>
                  </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg mb-4">
                  <button
                    onClick={() => setVaultTab('memory')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${vaultTab === 'memory' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Persistent Info
                  </button>
                  <button
                    onClick={() => setVaultTab('tasks')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${vaultTab === 'tasks' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Task History
                  </button>
                </div>

                {vaultTab === 'memory' ? (
                  <>
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!newFact.trim()) return;
                        aiMemory.addMemory(newFact.trim());
                        setMemories(aiMemory.getMemories());
                        setNewFact('');
                      }}
                      className="flex gap-2 mb-4"
              >
                <input
                  type="text"
                  value={newFact}
                  onChange={(e) => setNewFact(e.target.value)}
                  placeholder="Add memory info (e.g. 'Keep answers short')"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Memory List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {memories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    No saved memories yet. The AI will automatically learn as you converse.
                  </div>
                ) : (
                  memories.map((m) => (
                    <div 
                      key={m.id}
                      className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-start justify-between gap-2 shadow-2xs group"
                    >
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                        {m.fact}
                      </p>
                      <button
                        onClick={() => {
                          aiMemory.deleteMemory(m.id);
                          setMemories(aiMemory.getMemories());
                        }}
                        className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete this memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
                  <div className="flex-1 space-y-2 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No completed task history yet.
                      </div>
                    ) : (
                      tasks.map((t) => (
                        <div 
                          key={t.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs group flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">Task Summary</span>
                            <span className="text-[9px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString('en-US')}</span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex-1">
                            {t.summary}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : !isReady ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-2">
                <Bot className="w-10 h-10 text-accent animate-pulse" />
                <div className="space-y-2 w-full px-2">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Lightweight & Fast AI Engine</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Runs locally and ultra-fast on WebGPU via ReAct architecture.</p>
                  
                  {/* Model Selector Cards */}
                  {!isInitializing && (
                    <div className="flex flex-col gap-2 my-3 text-left">
                      {AVAILABLE_AI_MODELS.map((model) => {
                        const isSelected = selectedModelId === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => {
                              setSelectedModelId(model.id);
                              aiAgent.setModel(model.id);
                            }}
                            className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'border-accent bg-accent/10 dark:bg-accent/20 shadow-xs ring-1 ring-accent'
                                : 'border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {model.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                  {model.size}
                                </span>
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                  {model.speed}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                              {model.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {isInitializing ? (
                    <div className="space-y-2 mt-4">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div 
                          className="bg-accent h-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">{progressText}</p>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {initError && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{initError}</p>
                      )}
                      <button
                        onClick={handleInit}
                        className="px-4 py-2.5 w-full bg-accent hover:bg-accent-hover text-white text-sm font-semibold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        Start AI ({AVAILABLE_AI_MODELS.find(m => m.id === selectedModelId)?.size || '~800 MB'})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role !== 'system' && m.role !== 'tool' && (m.role === 'user' || (m.content && String(m.content).trim().length > 0))).map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  const textContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2);
                  const isCopied = copiedIdx === idx;

                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2 }}
                      className={`flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 px-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {isUser ? (
                          <span>Siz</span>
                        ) : (
                          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Nova Asistan</span>
                          </div>
                        )}
                      </div>

                      <div className={`max-w-[92%] rounded-2xl px-4 py-3.5 text-[13.5px] leading-relaxed overflow-hidden shadow-sm transition-all ${
                        isUser 
                          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-tr-xs font-normal' 
                          : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/80 dark:border-slate-700/80 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1.5 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900/90 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700 prose-pre:rounded-xl prose-pre:p-3 prose-pre:text-xs'
                      }`}>
                        {isUser ? (
                          <span className="whitespace-pre-wrap break-words">{textContent}</span>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {textContent}
                          </ReactMarkdown>
                        )}
                      </div>

                      {!isUser && (
                        <div className="flex items-center gap-1.5 px-1 mt-0.5">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(textContent);
                              setCopiedIdx(idx);
                              setTimeout(() => setCopiedIdx(null), 2000);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Copy Text"
                          >
                            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            onClick={() => tts.speak(textContent)}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            title="Read Aloud"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                            <span>Read Aloud</span>
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                
                {/* Live streaming bubble */}
                {isLoading && streamingText ? (
                  <motion.div
                    key="streaming"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-1.5 items-start"
                  >
                    <div className="flex items-center gap-1.5 px-1 text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      <span>Nova Assistant is responding...</span>
                    </div>
                    <div className="max-w-[92%] rounded-2xl px-4 py-3.5 text-[13.5px] leading-relaxed overflow-hidden shadow-sm bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-cyan-500/30 dark:border-cyan-500/30 prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1.5">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-2 p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 rounded-2xl"
                  >
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-xs font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-600 dark:text-cyan-400" />
                      <span>AI is thinking and analyzing the page...</span>
                    </div>
                    
                    {queuedActions.filter(a => a.state === 'executing').map(action => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-1.5 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                            {action.toolName}
                          </span>
                          <span className="text-[10px] text-slate-400">Executing</span>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 break-all bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-lg">
                          {JSON.stringify(action.args)}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}

                {/* Action approval gate: non read-only tool calls wait here for
                    an explicit user decision before the agent may run them. */}
                {queuedActions.filter(a => a.state === 'pending').map(action => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 p-3 bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 rounded-2xl shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      Action Approval Required
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Assistant requests permission to execute browser action:
                    </p>
                    <div className="text-[10px] font-mono text-slate-600 dark:text-slate-300 break-all bg-white dark:bg-slate-900 p-2 rounded-xl border border-amber-200 dark:border-amber-800/40">
                      <span className="font-bold text-amber-600 dark:text-amber-400">{action.toolName}</span>: {JSON.stringify(action.args)}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => orchestrator.approveAction(action.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => orchestrator.denyAction(action.id)}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-red-500 hover:text-white text-slate-700 dark:text-slate-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Quick Action Starter Prompts */}
                {isReady && messages.length <= 1 && !isLoading && (
                  <div className="flex flex-col gap-2 p-3 mt-2 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quick Actions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Summarize this page',
                        'Extract key insights',
                        'Translate to English',
                        'List action items',
                        'Take screenshot'
                      ].map((promptText, i) => (
                        <button
                          key={i}
                          onClick={() => handleAIAction(promptText)}
                          className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-2xs active:scale-95 text-left cursor-pointer"
                        >
                          {promptText}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Modern Assistant UI Elements Composer Footer */}
          {isReady && (
            <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/90 dark:bg-[#151122]/95 backdrop-blur-md">
              {/* Global agent status pill */}
              {statusPill && (
                <div className="mb-2">
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs ${statusPill.classes}`}
                  >
                    {statusPill.icon}
                    <span className="font-medium flex-shrink-0">{statusPill.label}</span>
                    {statusPill.detail && (
                      <span className="truncate opacity-80" title={statusPill.detail}>{statusPill.detail}</span>
                    )}
                  </motion.div>
                  {loadProgressPct !== null && (
                    <div className="mt-1 h-0.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                        style={{ width: `${loadProgressPct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Transient inline hint */}
              {attachmentHint && (
                <p className="mb-2 text-[10px] text-red-500 dark:text-red-400 font-medium">{attachmentHint}</p>
              )}

              {/* Attachment Tray */}
              {(pendingImages.length > 0 || pendingFiles.length > 0) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 p-1.5 bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl">
                  {pendingImages.map(img => (
                    <div key={img.id} className="relative group flex-shrink-0">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        title={img.name}
                        className="h-10 w-10 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => removePendingImage(img.id)}
                        className="absolute -top-1 -right-1 p-0.5 rounded-full bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-800 hover:bg-red-500 hover:text-white transition-colors"
                        title="Remove attachment"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  {pendingFiles.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 max-w-[130px]"
                    >
                      <FileText className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                      <span className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate" title={f.name}>
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removePendingFile(f.id)}
                        className="p-0.5 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 cursor-pointer"
                        title="Remove attachment"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Main Composer Box */}
              <div className="relative flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-700/90 bg-white dark:bg-slate-900/95 shadow-sm focus-within:border-cyan-500/60 dark:focus-within:border-cyan-400/60 focus-within:ring-2 focus-within:ring-cyan-500/15 transition-all">
                {/* Textarea */}
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder={isListening ? "Listening..." : "Ask Nova Agent anything or give instructions..."}
                  rows={Math.min(4, Math.max(1, input.split('\n').length))}
                  disabled={isLoading || isListening}
                  className="w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-[13.5px] leading-relaxed text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none max-h-32 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                />

                {/* Bottom Controls Bar */}
                <div className="flex items-center justify-between px-2.5 py-2">
                  <div className="flex items-center gap-1.5">
                    {/* Model Picker Pill */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsModelDropdownOpen(prev => !prev)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200/80 dark:hover:bg-slate-700 transition-all cursor-pointer border border-slate-200/60 dark:border-slate-700/60"
                        title="Select Model"
                      >
                        <Bot className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                        <span className="font-semibold text-[10px]">
                          {(AVAILABLE_AI_MODELS.find(m => m.id === selectedModelId)?.name || 'Llama 3.2').split('(')[0].trim()}
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      </button>

                      {isModelDropdownOpen && (
                        <div className="absolute bottom-full left-0 mb-2 z-50 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
                          <div className="text-[10px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">AI Models</div>
                          {AVAILABLE_AI_MODELS.map(m => (
                            <button
                              key={m.id}
                              type="button"
                              onClick={async () => {
                                const newModelId = m.id;
                                setSelectedModelId(newModelId);
                                setIsModelDropdownOpen(false);
                                if (newModelId !== aiAgent.getModel()) {
                                  aiAgent.setModel(newModelId);
                                  setIsReady(false);
                                  setIsInitializing(true);
                                  setInitError('');
                                  try {
                                    await aiAgent.init((p, text) => {
                                      setProgress(p);
                                      setProgressText(text);
                                    });
                                    setIsReady(true);
                                    setMessages(prev => [...prev, { role: 'assistant', content: `AI model switched to **${m.name}** and ready.` }]);
                                  } catch (err: any) {
                                    setInitError('Failed to load model: ' + (err?.message || 'Error'));
                                  } finally {
                                    setIsInitializing(false);
                                  }
                                }
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                                selectedModelId === m.id
                                  ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold'
                                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium text-[11px]">{m.name.split('(')[0].trim()}</span>
                                <span className="text-[9px] text-slate-400">{m.description.slice(0, 30)}...</span>
                              </div>
                              <span className="text-[9px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">{m.size}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* File Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
                      title="Attach Image or File"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Right Side: Audio visualizer & Action button */}
                  <div className="flex items-center gap-1.5">
                    {isListening && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-medium animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>Listening</span>
                      </div>
                    )}

                    {isLoading ? (
                      <button
                        type="button"
                        onClick={handleStop}
                        className="flex size-7.5 items-center justify-center rounded-xl bg-red-500 hover:bg-red-600 text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Stop"
                      >
                        <Square className="w-3.5 h-3.5 fill-current" />
                      </button>
                    ) : hasSpeechRecognition && !input.trim() && pendingImages.length === 0 && pendingFiles.length === 0 ? (
                      <button
                        type="button"
                        onMouseDown={handleMouseDownMic}
                        onMouseUp={handleMouseUpMic}
                        onMouseLeave={handleMouseUpMic}
                        className={`flex size-7.5 items-center justify-center rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer ${
                          isListening
                            ? 'bg-red-500 text-white shadow-red-500/30 animate-pulse'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                        title="Push to Talk"
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!input.trim() && pendingImages.length === 0 && pendingFiles.length === 0}
                        className="flex size-7.5 items-center justify-center rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm disabled:opacity-40 disabled:pointer-events-none active:scale-95 cursor-pointer"
                        title="Send"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Hidden attachment input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ATTACH_INPUT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    addFilesToAttachments(e.target.files);
                  }
                  e.target.value = '';
                }}
              />
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

