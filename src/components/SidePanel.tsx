import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Brain, Trash2, Plus, Loader2, RefreshCw, Volume2, VolumeX, Mic, MicOff, Square, ShieldAlert, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAgent, AVAILABLE_AI_MODELS } from '../services/aiAgent';
import { aiMemory, MemoryItem, TaskSummary } from '../services/aiMemory';
import { tts } from '../services/tts';
import { orchestrator, QueuedAction } from '../services/agentOrchestrator';
import { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidePanel = React.memo(({ 
  isOpen, 
  onClose
}: SidePanelProps) => {
  const isDemo = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === 'true';
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>(() => {
    if (isDemo) {
      return [
        { role: 'user', content: 'Can you summarize what makes Nova Browser special?' },
        { role: 'assistant', content: '**Nova Browser** yapay zeka tabanli bir tarayicidir:\n\n- **Otonom Ajanlar**: Gorsel imlec ile tam tarayici kontrolu.\n- **Sifir Bilgili Senkronizasyon**: AES-256-GCM sifreleme ile 1 tikla cihaz eslestirme.\n- **Gizlilik Kalkani**: Yerlesik reklam ve takipci engelleme.\n- **Dual-View Bolunmus Ekran** ve ozellestirilebilir calisma alanlari.' }
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
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

  const handleAIAction = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatCompletionMessageParam = { role: 'user', content: text };
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
      });

      setStreamingText('');
      setMessages(updatedMessages.filter(m => m.role !== 'tool'));
      setMemories(aiMemory.getMemories());
    } catch (err: any) {
      console.error('[AI Chat Error]', err);
      const rawMsg = err?.message ?? err?.toString() ?? '';
      let errMsg: string;
      if (rawMsg.includes('Engine not initialized')) {
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
    if (!input.trim() || isLoading) return;
    const currentInput = input;
    setInput('');
    await handleAIAction(currentInput);
  };

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

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="absolute top-0 right-0 bottom-0 w-80 border-l border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#151122]/98 backdrop-blur-2xl flex flex-col h-full z-40 shadow-2xl"
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
              {isLoading && (
                <button
                  onClick={() => {
                    aiAgent.interrupt();
                    tts.stop();
                    orchestrator.clearQueue();
                  }}
                  className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                  title="Stop Agent"
                >
                  <Square className="w-4 h-4 fill-current" />
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
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
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
                            <span className="text-[9px] text-slate-400">{new Date(t.timestamp).toLocaleTimeString()}</span>
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
                  <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Hafif ve Hızlı Yapay Zeka Motoru</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">ReAct mimarisi sayesinde WebGPU üzerinde yerel ve ultra hızlı çalışır.</p>
                  
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
                        Yapay Zekayı Başlat ({AVAILABLE_AI_MODELS.find(m => m.id === selectedModelId)?.size || '~800 MB'})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.filter(m => m.role !== 'system' && m.role !== 'tool' && (m.role === 'user' || (m.content && String(m.content).trim().length > 0))).map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex flex-col gap-1 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden shadow-sm ${
                      msg.role === 'user' 
                        ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 rounded-br-none font-medium' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700'
                    }`}>
                      {msg.role === 'user' ? (
                        typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content, null, 2)}
                        </ReactMarkdown>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => tts.speak(msg.content as string)}
                        className="flex items-center gap-1 px-2 py-1 mt-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Read Aloud"
                      >
                        <Volume2 className="w-3 h-3" /> Read
                      </button>
                    )}
                  </motion.div>
                ))}
                
                {/* Live streaming bubble */}
                {isLoading && streamingText ? (
                  <motion.div
                    key="streaming"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start"
                  >
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden shadow-sm bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-pre:bg-slate-100 dark:prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-200 dark:prose-pre:border-slate-700">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-2"
                  >
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                    
                    {queuedActions.filter(a => a.state === 'executing').map(action => (
                      <motion.div
                        key={action.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm"
                      >
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 text-sm font-medium">
                          <Loader2 className="w-4 h-4 animate-spin text-accent" />
                          Executing Action...
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {action.toolName}
                        </p>
                        <div className="text-[10px] text-slate-400 break-all bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          {JSON.stringify(action.args)}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}

                {/* Action approval gate (C-1): non read-only tool calls wait here
                    for an explicit user decision before the agent may run them. */}
                {queuedActions.filter(a => a.state === 'pending').map(action => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-300 dark:border-amber-500/40 rounded-xl shadow-sm"
                  >
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm font-medium">
                      <ShieldAlert className="w-4 h-4" />
                      Approval Required
                    </div>
                    <p className="text-xs text-slate-500 font-mono">
                      {action.toolName}
                    </p>
                    <div className="text-[10px] text-slate-400 break-all bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      {JSON.stringify(action.args)}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => orchestrator.approveAction(action.id)}
                        className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white transition-colors flex items-center justify-center gap-1 active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => orchestrator.denyAction(action.id)}
                        className="flex-1 px-2 py-1.5 text-xs font-semibold rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors flex items-center justify-center gap-1 active:scale-95"
                      >
                        <X className="w-3.5 h-3.5" /> Deny
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Quick Action Starter Prompts */}
                {isReady && messages.length <= 1 && !isLoading && (
                  <div className="flex flex-col gap-2 p-3 mt-2 rounded-2xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/8">
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quick Actions</span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        '✨ Summarize this page',
                        '💡 Key takeaways',
                        '❓ Explain simply',
                        '🌐 Translate to Turkish',
                        '📝 Extract action items'
                      ].map((promptText, i) => (
                        <button
                          key={i}
                          onClick={() => handleAIAction(promptText)}
                          className="px-2.5 py-1 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/10 hover:border-cyan-500 dark:hover:border-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 transition-all shadow-2xs active:scale-95 text-left cursor-pointer"
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

          {/* Footer (Input) - Always visible when ready */}
          {isReady && (
            <div className="p-3.5 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] backdrop-blur-md">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                {hasSpeechRecognition && (
                  <button
                    type="button"
                    onMouseDown={handleMouseDownMic}
                    onMouseUp={handleMouseUpMic}
                    onMouseLeave={handleMouseUpMic}
                    className={`p-2.5 rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
                        : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-white/10'
                    }`}
                    title="Push to Talk"
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                )}
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask something, navigate, analyze..."}
                    className="w-full bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl py-2.5 pl-4 pr-10 text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </form>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
});
