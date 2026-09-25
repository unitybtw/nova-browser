import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  X,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Globe,
  Loader2,
  ChevronDown,
  Brain,
  Compass,
  Layers,
  Search,
  Zap,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Tab } from '../types/browser';
import {
  aiAgent,
  AVAILABLE_AI_MODELS,
  detectDirectIntent,
} from '../services/aiAgent';
import { tts } from '../services/tts';
import { getLocale } from '../services/i18n';
import { isSafeNavigationUrl } from '../utils/safeNavigation';
import { copyTextToClipboard } from '../utils/clipboard';
import type { ChatCompletionMessageParam } from '@mlc-ai/web-llm';
import { PromptInput } from './ui/ai-chat-input';
import { NovaAISparkle } from './ui/NovaAISparkle';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: {
    text: string;
    durationMs?: number;
  };
  attachments?: Array<{
    name: string;
    url: string;
  }>;
  toolCalls?: Array<{
    id: string;
    name: string;
    args?: any;
    state?: 'pending' | 'executing' | 'completed' | 'success' | 'failed' | 'error';
    result?: any;
    error?: string;
    durationMs?: number;
  }>;
}

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: Tab;
  isDemo?: boolean;
  pendingActions?: Array<{ id: number; text: string }>;
  onPendingActionConsumed?: (id: number) => void;
}

export const SidePanel = React.memo(({
  isOpen,
  onClose,
  activeTab,
  isDemo = false,
  pendingActions = [],
  onPendingActionConsumed,
}: SidePanelProps) => {
  const isTr = getLocale() === 'tr-TR';
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (isDemo) {
      return [
        {
          role: 'user',
          content: isTr ? 'Bu sayfayı özetle' : 'Summarize this page',
        },
        {
          role: 'assistant',
          content: isTr
            ? '### Sayfa Özeti\nNova Browser, yerel WebGPU hızlandırmalı yapay zeka ile verilerinizi cihazınızdan çıkarmadan çalışır.\n\n- **Gizlilik:** Sayfa içeriği ve sorgularınız dış sunuculara iletilmez.\n- **Sekme Yönetimi:** Sekmeleri gruplayabilir, arayabilir ve dondurabilirsiniz.'
            : '### Page Summary\nNova Browser runs local WebGPU-accelerated AI entirely on your device without transmitting data.\n\n- **Privacy:** Page contents and prompts never leave your machine.\n- **Tab Management:** Group, search, and hibernate tabs automatically.',
        },
      ];
    }
    return [];
  });

  const [selectedModelId, setSelectedModelId] = useState<string>(() => aiAgent.getModel());
  const [isReady, setIsReady] = useState(() => isDemo || aiAgent.isReady());
  const [isInitializing, setIsInitializing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatusText, setDownloadStatusText] = useState('');
  const [agentStatusText, setAgentStatusText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [streamStartTime, setStreamStartTime] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef<ChatMessage[]>(messages);
  const requestIdRef = useRef<number>(0);
  // Object URLs minted for attachment previews; revoked on reset/unmount.
  const blobUrlsRef = useRef<string[]>([]);
  const revokeBlobUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Already revoked or invalid — ignore.
      }
    }
    blobUrlsRef.current = [];
  }, []);

  // Release attachment preview URLs when the panel unmounts.
  useEffect(() => {
    return () => revokeBlobUrls();
  }, [revokeBlobUrls]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  // True while the user sits at (or near) the bottom; auto-scroll only then.
  const isAtBottomRef = useRef(true);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = useCallback((smooth = true) => {
    isAtBottomRef.current = true;
    setShowScrollButton(false);
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      isAtBottomRef.current = true;
      setShowScrollButton(false);
      scrollToBottom(false);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    // Never yank the viewport while the user reads older messages.
    if (isAtBottomRef.current) {
      scrollToBottom(!streamingText);
    }
  }, [messages, streamingText, scrollToBottom]);

  const handleChatScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const atBottom = distanceFromBottom < 120;
    isAtBottomRef.current = atBottom;
    setShowScrollButton(prev => (prev === !atBottom ? prev : !atBottom));
  }, []);

  // Sync agent status
  useEffect(() => {
    const unsub = aiAgent.onStatus((status) => {
      setIsReady(aiAgent.isReady());
      const isLoadingModel = status.state === 'loading_model';
      setIsInitializing(isLoadingModel);
      if (isLoadingModel && status.detail) {
        const match = status.detail.match(/(\d+)%/);
        if (match) {
          setDownloadProgress(parseInt(match[1], 10));
        }
        setDownloadStatusText(status.detail);
      } else if (status.state === 'idle') {
        setDownloadProgress(100);
      }

      if (status.state === 'acting') {
        setAgentStatusText(isTr ? `İşlem yürütülüyor: ${status.detail || ''}` : `Executing: ${status.detail || ''}`);
      } else if (status.state === 'thinking') {
        setAgentStatusText(isTr ? 'Düşünüyor...' : 'Thinking...');
      } else if (status.state === 'loading_model') {
        setAgentStatusText(isTr ? 'Model hazırlanıyor...' : 'Preparing model...');
      } else if (status.state === 'idle') {
        setAgentStatusText('');
      }
    });
    return () => unsub();
  }, [isTr]);

  // Listen to pending actions from outside
  useEffect(() => {
    if (pendingActions && pendingActions.length > 0) {
      const action = pendingActions[0];
      handleSendPrompt(action.text);
      onPendingActionConsumed?.(action.id);
    }
  }, [pendingActions, onPendingActionConsumed]);

  // Model download / init handler
  const handleInit = useCallback(async () => {
    if (aiAgent.isReady()) {
      setIsReady(true);
      return;
    }
    setIsInitializing(true);
    setDownloadProgress(0);
    setDownloadStatusText(isTr ? 'AI Modeli hazırlanıyor...' : 'Preparing AI model...');
    try {
      await aiAgent.init((p, text) => {
        setDownloadProgress(Math.round(p));
        setDownloadStatusText(text);
      });
      setIsReady(true);
    } catch (err: any) {
      console.error('[SidePanel] Init error:', err);
      const errMsg = err?.message || String(err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isTr
            ? `⚠️ **AI Modeli Başlatılamadı:** ${errMsg}\n\nLütfen WebGPU desteğini ve internet bağlantınızı kontrol edip tekrar deneyin.`
            : `⚠️ **Failed to start AI model:** ${errMsg}\n\nPlease check your WebGPU settings and connection, then try again.`,
        },
      ]);
    } finally {
      setIsInitializing(false);
    }
  }, [isTr]);

  // Send message flow
  const handleSendPrompt = useCallback(
    async (
      textToSend?: string,
      meta?: { model?: string; effort?: string; attachments?: File[] }
    ) => {
      const prompt = (textToSend || '').trim();
      if (!prompt || isLoading) return;

      // Convert attachments for local preview and agent input
      let chatAttachments: { images: string[]; files: Array<{ name: string; text: string }> } | undefined;
      const userAttachments: Array<{ name: string; url: string }> = [];

      if (meta?.attachments && meta.attachments.length > 0) {
        const images: string[] = [];
        const files: Array<{ name: string; text: string }> = [];
        // Memory guards: images decode to base64, text loads fully into RAM.
        const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
        const MAX_TEXT_BYTES = 256 * 1024;

        for (const file of meta.attachments) {
          if (file.type.startsWith('image/')) {
            if (file.type === 'image/svg+xml' || file.size > MAX_IMAGE_BYTES) continue;
          } else if (file.size > MAX_TEXT_BYTES) {
            continue;
          }
          const blobUrl = URL.createObjectURL(file);
          blobUrlsRef.current.push(blobUrl);
          userAttachments.push({ name: file.name, url: blobUrl });

          if (file.type.startsWith('image/')) {
            try {
              const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
              });
              images.push(base64);
            } catch (e) {
              console.error('[SidePanel] Failed to read image attachment:', e);
            }
          } else {
            try {
              const text = await file.text();
              files.push({ name: file.name, text });
            } catch (e) {
              console.error('[SidePanel] Failed to read text attachment:', e);
            }
          }
        }

        if (images.length > 0 || files.length > 0) {
          chatAttachments = { images, files };
        }
      }

      const userMessage: ChatMessage = {
        role: 'user',
        content: prompt,
        attachments: userAttachments.length > 0 ? userAttachments : undefined,
      };
      const nextMessages = [...messagesRef.current, userMessage];
      setMessages(nextMessages);
      messagesRef.current = nextMessages;

      setIsLoading(true);
      setStreamingText('');
      const startTime = Date.now();
      setStreamStartTime(startTime);

      const requestId = ++requestIdRef.current;

      try {
        // Switch to Vision model if images are present and current model lacks vision
        if (chatAttachments?.images && chatAttachments.images.length > 0) {
          const visionModel = AVAILABLE_AI_MODELS.find((m) => m.vision);
          if (visionModel && aiAgent.getModel() !== visionModel.id) {
            setSelectedModelId(visionModel.id);
            await aiAgent.setModel(visionModel.id);
          }
        }

        // Direct browser actions (navigate, tabs, scroll, greetings) do not need the heavy LLM engine
        const directIntent = (chatAttachments?.images?.length || chatAttachments?.files?.length)
          ? null
          : detectDirectIntent(prompt);

        if (!directIntent || directIntent.isSummary) {
          if (!aiAgent.isReady()) {
            await handleInit();
          }

          if (requestId !== requestIdRef.current) return;

          if (!aiAgent.isReady()) {
            setMessages([
              ...nextMessages,
              {
                role: 'assistant',
                content: isTr
                  ? 'AI motoru başlatılamadı. Lütfen modelin yüklenmesini bekleyin veya WebGPU desteğinizi kontrol edin.'
                  : 'AI engine could not be started. Please wait for model download or check WebGPU support.',
              },
            ]);
            setIsLoading(false);
            return;
          }
        }

        // WebLLM / aiAgent chat execution
        let accumulated = '';
        let lastRender = 0;
        const THROTTLE = 50;

        const agentResult = await aiAgent.chat(
          nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })) as ChatCompletionMessageParam[],
          (chunk) => {
            if (requestId !== requestIdRef.current) return;
            accumulated += chunk;
            const now = performance.now();
            if (now - lastRender > THROTTLE) {
              setStreamingText(accumulated);
              lastRender = now;
            }
          },
          chatAttachments
        );

        if (requestId !== requestIdRef.current) return;

        // Extract last assistant message from agentResult if available
        const lastAssistantMsg = Array.isArray(agentResult)
          ? [...agentResult].reverse().find((m) => m.role === 'assistant')
          : null;
        const rawContent = (typeof lastAssistantMsg?.content === 'string' ? lastAssistantMsg.content : '') || accumulated;

        // Parse reasoning (<think> tags from DeepSeek/Qwen)
        let cleanContent = rawContent;
        let reasoningText: string | undefined;

        const thinkStart = rawContent.indexOf('<think>');
        if (thinkStart !== -1) {
          const thinkEnd = rawContent.indexOf('</think>');
          if (thinkEnd !== -1) {
            reasoningText = rawContent.substring(thinkStart + 7, thinkEnd).trim();
            cleanContent = (rawContent.substring(0, thinkStart) + rawContent.substring(thinkEnd + 8)).trim();
          }
        }

        const finalAssistantMsg: ChatMessage = {
          role: 'assistant',
          content: cleanContent || (isTr ? 'İşlem tamamlandı.' : 'Completed.'),
          reasoning: reasoningText
            ? {
                text: reasoningText,
                durationMs: Date.now() - startTime,
              }
            : undefined,
          toolCalls: (lastAssistantMsg as any)?.toolCalls,
        };

        const finalMessages = [...nextMessages, finalAssistantMsg];
        setMessages(finalMessages);
        messagesRef.current = finalMessages;
      } catch (err: any) {
        console.error('[SidePanel] Chat error:', err);
        setMessages([
          ...nextMessages,
          {
            role: 'assistant',
            content: isTr
              ? `Bir hata oluştu: ${err?.message || 'Bilinmeyen hata'}`
              : `An error occurred: ${err?.message || 'Unknown error'}`,
          },
        ]);
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
          setStreamingText('');
          setStreamStartTime(null);
        }
      }
    },
    [isLoading, handleInit, isTr]
  );

  const handleStop = useCallback(() => {
    requestIdRef.current++;
    aiAgent.interrupt();
    setIsLoading(false);
    if (streamingText.trim()) {
      const stoppedMsg: ChatMessage = {
        role: 'assistant',
        content: `${streamingText}\n\n*(durduruldu / stopped)*`,
      };
      setMessages((prev) => [...prev, stoppedMsg]);
    }
    setStreamingText('');
    setStreamStartTime(null);
  }, [streamingText]);

  const handleCopy = useCallback(async (text: string, idx: number) => {
    const ok = await copyTextToClipboard(text);
    if (!ok) return;
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }, []);

  // Subscribe to TTS speaking state
  useEffect(() => {
    return tts.subscribe((speaking) => setIsSpeaking(speaking));
  }, []);

  const handleSpeak = useCallback((text: string) => {
    if (isSpeaking) {
      tts.stop();
    } else {
      tts.speak(text);
    }
  }, [isSpeaking]);

  const handleResetChat = useCallback(() => {
    revokeBlobUrls();
    setMessages([]);
    messagesRef.current = [];
    setStreamingText('');
  }, [revokeBlobUrls]);

  const handleSelectModel = useCallback(async (modelId: string) => {
    if (modelId === selectedModelId && isReady) return;

    setSelectedModelId(modelId);
    setIsReady(false);
    setIsInitializing(true);
    setDownloadProgress(0);
    try {
      await aiAgent.setModel(modelId);
      await aiAgent.init((p, text) => {
        setDownloadProgress(p);
        setDownloadStatusText(text);
      });
      setIsReady(true);
    } catch (err: any) {
      console.error('[SidePanel] Model switch error:', err);
    } finally {
      setIsInitializing(false);
    }
  }, [selectedModelId, isReady]);

  if (!isOpen) return null;

  const currentModel = AVAILABLE_AI_MODELS.find((m) => m.id === selectedModelId) || AVAILABLE_AI_MODELS[0];
  const hasActiveWebPage = activeTab && activeTab.url && !activeTab.url.startsWith('nova://') && activeTab.url !== 'about:blank';

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 420, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{ width: 420, minWidth: 420, maxWidth: 420 }}
      className="flex-shrink-0 w-[420px] min-w-[420px] max-w-[420px] relative h-full border-l border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/98 backdrop-blur-2xl flex flex-col z-20 shadow-xl overflow-hidden select-none"
    >
      {/* 1. TOP CONTROLS (Seamless, unified without separate background tone or brand clutter) */}
      <div className="flex flex-col px-3.5 pt-3 pb-1 shrink-0">
        <div className="flex items-center justify-between min-h-[30px]">
          {/* Left: Model download progress if loading */}
          <div className="flex items-center gap-2">
            {isInitializing && (
              <div className="flex items-center gap-1.5 text-xs text-cyan-600 dark:text-cyan-400 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span className="text-[11px] font-mono">{downloadProgress > 0 ? `${downloadProgress}%` : ''}</span>
              </div>
            )}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 ml-auto">
            {messages.length > 0 && !isLoading && (
              <button
                type="button"
                onClick={handleResetChat}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title={isTr ? 'Sohbeti Temizle' : 'Reset Chat'}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/10 transition-colors cursor-pointer"
              title={isTr ? 'Kapat' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active Tab Context Bar */}
        {hasActiveWebPage && (
          <div className="mt-2 px-3 py-1.5 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/60 dark:border-white/10 flex items-center justify-between gap-2 shadow-2xs backdrop-blur-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse shrink-0" />
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-[11.5px] font-medium text-slate-700 dark:text-slate-300 truncate" title={activeTab.title || activeTab.url}>
                {activeTab.title || activeTab.url}
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleSendPrompt(isTr ? 'Bu sayfayı özetle' : 'Summarize this page')}
              className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-all cursor-pointer active:scale-95 shrink-0"
            >
              {isTr ? '✦ Özetle' : '✦ Summarize'}
            </button>
          </div>
        )}
      </div>

      {/* 2. CHAT MESSAGES BODY */}
      <div
        ref={scrollContainerRef}
        onScroll={handleChatScroll}
        className="relative flex-1 p-4 nova-chat-scroll flex flex-col gap-4 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/15 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-white/25"
      >
        {/* Model Download Progress Card */}
        {isInitializing && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-2xl border border-cyan-500/30 bg-cyan-50/50 dark:bg-cyan-950/20 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2 text-xs">
              <div className="flex items-center gap-2 font-semibold text-cyan-700 dark:text-cyan-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{currentModel.name.split('(')[0].trim()}</span>
              </div>
              <span className="text-[10.5px] font-mono text-cyan-600 dark:text-cyan-400">
                {downloadProgress}%
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
            <p className="mt-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 truncate">
              {downloadStatusText || (isTr ? 'Ağırlıklar diske indiriliyor...' : 'Downloading model weights...')}
            </p>
          </motion.div>
        )}

        {/* Empty State */}
        {messages.length === 0 && !isLoading && (
          <div className="my-auto flex flex-col items-center justify-center text-center px-4 py-8">
            <div className="mb-3.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 text-cyan-500 shadow-2xs">
              <NovaAISparkle size={20} active={false} />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {isTr ? 'Nova Asistan' : 'Nova Assistant'}
            </h3>
            <p className="mt-1 max-w-[250px] text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isTr
                ? 'Sayfaları özetleyin, sekmeleri yönetin veya web üzerinde yerel yapay zeka ile çalışın.'
                : 'Summarize web pages, manage tabs, or run local AI workflows on your machine.'}
            </p>

            {/* Quick Starters */}
            <div className="mt-5 w-full flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => handleSendPrompt(isTr ? 'Bu sayfayı özetle' : 'Summarize this page')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-left border border-slate-200/60 dark:border-white/5 transition-all text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white group cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0 transition-colors" />
                <span className="truncate">{isTr ? 'Bu sayfayı özetle' : 'Summarize this page'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPrompt(isTr ? 'Açık sekmeleri listele' : 'List open tabs')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-left border border-slate-200/60 dark:border-white/5 transition-all text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white group cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0 transition-colors" />
                <span className="truncate">{isTr ? 'Açık sekmeleri listele' : 'List open tabs'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSendPrompt(isTr ? 'Web üzerinde en son haberleri ara' : 'Search latest news on web')}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/70 dark:hover:bg-slate-800 text-left border border-slate-200/60 dark:border-white/5 transition-all text-xs text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white group cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 shrink-0 transition-colors" />
                <span className="truncate">{isTr ? 'En son haberleri ara' : 'Search latest news'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Message Items */}
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isReasoningOpen = Boolean(expandedReasoning[idx]);

          return (
            <div
              key={idx}
              className={`flex flex-col gap-1.5 w-full ${isUser ? 'items-end' : 'items-start'} group`}
            >
              {/* Sender Tag */}
              <div className="flex items-center gap-1.5 px-1 text-[11px] text-slate-400 font-medium">
                {isUser ? (
                  <span>You</span>
                ) : (
                  <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
                    <Sparkles className="w-3 h-3" />
                    <span>Nova Assistant</span>
                  </div>
                )}
              </div>

              {/* Reasoning Accordion (DeepSeek/Claude style) */}
              {!isUser && msg.reasoning && (
                <div className="w-full max-w-[92%] rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 backdrop-blur-sm overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setExpandedReasoning((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                    className="flex w-full items-center justify-between px-3 py-2 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-purple-500" />
                      <span className="font-medium text-[11.5px]">Reasoning Process</span>
                      {msg.reasoning.durationMs && (
                        <span className="text-[9.5px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-1.5 py-0.5 rounded-full">
                          {(msg.reasoning.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isReasoningOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isReasoningOpen && (
                    <div className="p-3 border-t border-slate-200/60 dark:border-white/5 text-[11.5px] leading-relaxed font-mono text-slate-600 dark:text-slate-400 whitespace-pre-wrap max-h-52 nova-chat-scroll">
                      {msg.reasoning.text}
                    </div>
                  )}
                </div>
              )}

              {/* Tool Execution Pills */}
              {!isUser && msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1.5 w-full max-w-[92%] mb-0.5">
                  {msg.toolCalls.map((tc) => (
                    <div
                      key={tc.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 shadow-2xs"
                    >
                      <Zap className="w-3 h-3 text-cyan-500" />
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{tc.name}</span>
                      {tc.durationMs && (
                        <span className="text-[9.5px] text-slate-400">
                          {(tc.durationMs / 1000).toFixed(1)}s
                        </span>
                      )}
                      {tc.state === 'error' || tc.error ? (
                        <span className="text-rose-500 font-bold" title={tc.error}>✕</span>
                      ) : (
                        <span className="text-emerald-500 font-bold">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed overflow-hidden shadow-2xs transition-all relative ${
                  isUser
                    ? 'bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-100 rounded-tr-xs font-normal border border-slate-800/80 dark:border-white/10'
                    : 'bg-white/95 dark:bg-slate-900/80 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/90 dark:border-white/10 backdrop-blur-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800 prose-pre:rounded-xl prose-pre:p-3 prose-pre:text-xs prose-pre:text-slate-100'
                }`}
              >
                {isUser ? (
                  <>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2 justify-end">
                        {msg.attachments.map((att, i) => (
                          <img
                            key={i}
                            src={att.url}
                            alt={att.name}
                            className="size-16 object-cover rounded-xl border border-white/20 shadow-xs"
                          />
                        ))}
                      </div>
                    )}
                    <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                  </>
                ) : (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => {
                        // AI output is untrusted: never render javascript:/data: URLs as links.
                        if (!href || !isSafeNavigationUrl(href)) {
                          return <span className="underline opacity-60 break-all">{children}</span>;
                        }
                        return (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-500 underline hover:text-cyan-400 break-all"
                          >
                            {children}
                          </a>
                        );
                      },
                      p: ({ children }) => <p className="my-1 leading-relaxed break-words">{children}</p>,
                      pre: ({ children }) => (
                        <pre className="max-w-full overflow-x-auto rounded-xl p-3 my-2 bg-slate-950 text-slate-100 border border-slate-800 text-xs font-mono nova-chat-scroll">
                          {children}
                        </pre>
                      ),
                      code: ({ inline, children }: any) =>
                        inline ? (
                          <code className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-white/10 text-cyan-600 dark:text-cyan-400 font-mono text-[11.5px] break-all border border-slate-200/60 dark:border-white/5">
                            {children}
                          </code>
                        ) : (
                          <code className="block max-w-full overflow-x-auto whitespace-pre font-mono text-xs text-slate-100">
                            {children}
                          </code>
                        ),
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>

              {/* Action Buttons on Assistant Message */}
              {!isUser && (
                <div className="flex items-center gap-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.content, idx)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
                    title={isTr ? 'Kopyala' : 'Copy'}
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIdx === idx ? (isTr ? 'Kopyalandı' : 'Copied') : (isTr ? 'Kopyala' : 'Copy')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSpeak(msg.content)}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
                    title={isTr ? 'Sesli Oku' : 'Read aloud'}
                  >
                    {isSpeaking ? <VolumeX className="w-3 h-3 text-orange-500" /> : <Volume2 className="w-3 h-3" />}
                    <span>{isTr ? 'Seslendir' : 'Speak'}</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Live Streaming Message Bubble */}
        {isLoading && (
          <div className="flex flex-col gap-1.5 w-full items-start">
            <div className="flex items-center gap-1.5 px-1 text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
              <Sparkles className="w-3 h-3 animate-pulse" />
              <span>Nova Assistant</span>
              {streamStartTime && (
                <span className="text-[10px] font-mono text-slate-400">
                  · {((Date.now() - streamStartTime) / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <div className="max-w-[92%] rounded-2xl rounded-tl-xs px-4 py-3 bg-white/95 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 text-slate-800 dark:text-slate-100 text-[13px] leading-relaxed shadow-2xs">
              {streamingText ? (
                <>
                  <span className="whitespace-pre-wrap break-words">{streamingText}</span>
                  <span className="inline-block w-1.5 h-3.5 ml-1 bg-cyan-500 animate-pulse rounded-full align-middle" />
                </>
              ) : (
                <div className="flex items-center gap-2 text-slate-400 font-medium text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-500" />
                  <span>{agentStatusText || (isTr ? 'Düşünüyor veya işlem yapıyor...' : 'Thinking or executing action...')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        {showScrollButton && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/95 dark:bg-slate-800/95 border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-200 shadow-lg backdrop-blur-md hover:border-cyan-400/60 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all cursor-pointer"
            title={isTr ? 'En alta git' : 'Scroll to bottom'}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            {isTr ? 'Yeni mesajlar' : 'New messages'}
          </button>
        )}
      </div>

      {/* 3. MODERN SPRING PHYSICS PROMPT INPUT */}
      <footer className="p-3 pt-1.5 bg-gradient-to-t from-slate-100/95 via-slate-100/80 to-transparent dark:from-slate-950/95 dark:via-slate-950/80 dark:to-transparent backdrop-blur-md flex justify-center">
        <PromptInput
          fullWidth
          className="w-full"
          placeholder={
            hasActiveWebPage
              ? (isTr ? 'Bu sayfa veya web hakkında bir soru sorun...' : 'Ask about this page or instruct Nova...')
              : (isTr ? 'Nova Asistan’a bir şey sorun...' : 'Ask Nova Assistant anything...')
          }
          models={AVAILABLE_AI_MODELS.map((m) => m.name.split('(')[0].trim())}
          selectedModel={currentModel.name.split('(')[0].trim()}
          onModelChange={(modelName) => {
            // Prefer stable IDs so a future display-name change can't silently break matching.
            const key = modelName.toLowerCase();
            const found = AVAILABLE_AI_MODELS.find((m) => m.id.toLowerCase() === key)
              ?? AVAILABLE_AI_MODELS.find((m) => m.name === modelName)
              ?? AVAILABLE_AI_MODELS.find(
                (m) => m.name.split('(')[0].trim().toLowerCase() === key
              );
            if (found) {
              handleSelectModel(found.id);
            }
          }}
          isLoading={isLoading}
          onStop={handleStop}
          onSubmit={(prompt, meta) => {
            handleSendPrompt(prompt, meta);
          }}
        />
      </footer>
    </motion.aside>
  );
});
