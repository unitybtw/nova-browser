import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, Bot, Brain, Trash2, Plus, Loader2, RefreshCw, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiAgent } from '../services/aiAgent';
import { aiMemory, MemoryItem, TaskSummary } from '../services/aiMemory';
import { tts } from '../services/tts';
import { orchestrator, QueuedAction } from '../services/agentOrchestrator';
import { ChatCompletionMessageParam } from '@mlc-ai/web-llm';

// Setup Speech Recognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
let recognition: any = null;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'tr-TR';
}

interface SidePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ 
  isOpen, 
  onClose
}) => {
  const [messages, setMessages] = useState<ChatCompletionMessageParam[]>([]);
  const [input, setInput] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isReady, setIsReady] = useState(false);
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

  useEffect(() => {
    const unsubscribe = orchestrator.subscribe(actions => {
      setQueuedActions(actions);
    });
    return () => { unsubscribe(); };
  }, []);

  // Push-to-Talk Handlers
  const handleMouseDownMic = useCallback(() => {
    if (!recognition) return;
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) { console.error(e); }
  }, []);

  const handleMouseUpMic = useCallback(() => {
    if (!recognition) return;
    try {
      recognition.stop();
      setIsListening(false);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (!recognition) return;
    recognition.onresult = (event: any) => {
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
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  }, []);

  // Poll TTS state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(tts.isSpeaking);
    }, 300);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, streamingText]);

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
      setMessages([{ role: 'assistant', content: 'Merhaba! Tarayıcını kontrol etmem, sayfaları analiz etmem veya sorularını yanıtlamam için hazırım. Ne yapmamı istersin?' }]);
    } catch (err: any) {
      console.error(err);
      setInitError('AI motoru başlatılamadı. Lütfen tekrar deneyin.');
      setProgressText('Başlatma başarısız.');
    } finally {
      setIsInitializing(false);
    }
  }, [isReady, isInitializing]);

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
        setMessages([...newMessages, { role: 'assistant', content: 'AI motoru başlatılamadı. Lütfen "AI\'ı Başlat" butonuna basın.' }]);
        return;
      }

      let streamedSoFar = '';
      const updatedMessages = await aiAgent.chat(newMessages, (chunk) => {
        streamedSoFar += chunk;
        setStreamingText(streamedSoFar);
      });

      setStreamingText('');
      setMessages(updatedMessages.filter(m => m.role !== 'tool'));
      setMemories(aiMemory.getMemories());
    } catch (err: any) {
      console.error('[AI Chat Error]', err);
      const rawMsg = err?.message ?? err?.toString() ?? '';
      let errMsg: string;
      if (rawMsg.includes('Engine not initialized')) {
        errMsg = 'AI motoru henüz yüklenmedi. Lütfen önce "AI\'ı Başlat" butonuna tıklayın.';
      } else if (rawMsg.includes('ContentTypeError')) {
        errMsg = 'Mesaj formatı hatası oluştu. Sohbeti sıfırlayıp tekrar deneyin.';
      } else if (rawMsg) {
        errMsg = `Hata: ${rawMsg}`;
      } else {
        errMsg = 'Bilinmeyen bir hata oluştu. Konsolu kontrol edin.';
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

  useEffect(() => {
    const handleQuickAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const actionText = customEvent.detail;
      if (actionText) {
        if (!isOpen) {
          // Tell App.tsx to open SidePanel via a new event, or we need App.tsx to listen and open it!
          window.dispatchEvent(new CustomEvent('open-ai-sidepanel'));
        }
        setTimeout(() => {
          handleAIAction(actionText);
        }, 300);
      }
    };
    window.addEventListener('ai-quick-action', handleQuickAction);
    return () => window.removeEventListener('ai-quick-action', handleQuickAction);
  }, [messages, isLoading, isReady, isInitializing, isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-80 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col h-full shrink-0 z-30 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h2 className="font-semibold text-sm">Browser AI</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowMemoryVault(!showMemoryVault)}
                className={`p-1.5 rounded-lg transition-colors ${showMemoryVault ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600' : 'text-slate-400 dark:text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
                title="AI Kalıcı Hafıza Paneli"
              >
                <Brain className="w-4 h-4" />
              </button>
              {isReady && messages.length > 0 && (
                <button
                  onClick={() => setMessages([{ role: 'assistant', content: 'Sohbet sıfırlandı. Sana nasıl yardımcı olabilirim?' }])}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-500 transition-colors"
                  title="Sohbeti Sıfırla"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              {isSpeaking ? (
                <button
                  onClick={() => tts.stop()}
                  className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-500 animate-pulse transition-colors"
                  title="Okumayı Durdur"
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
                      <Brain className="w-4 h-4 text-indigo-500" /> AI Hafıza Kasası
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">Yapay zekanın öğrendikleri ve yaptıkları</p>
                  </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg mb-4">
                  <button
                    onClick={() => setVaultTab('memory')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${vaultTab === 'memory' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Kalıcı Bilgiler
                  </button>
                  <button
                    onClick={() => setVaultTab('tasks')}
                    className={`flex-1 py-1 text-xs font-medium rounded-md transition-colors ${vaultTab === 'tasks' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-800 dark:text-slate-200' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                  >
                    Görev Geçmişi
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
                  placeholder="Hafızaya bilgi ekle (ör: 'Kısa yanıt ver')"
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-medium transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>

              {/* Memory List */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {memories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Henüz kaydedilmiş hafıza yok. Konuştukça AI otomatik öğrenecektir.
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
                        title="Bu hafızayı sil"
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
                        Henüz tamamlanmış görev geçmişi yok.
                      </div>
                    ) : (
                      tasks.map((t) => (
                        <div 
                          key={t.id}
                          className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-2xs group flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">Görev Özeti</span>
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
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                <div className="space-y-2 w-full px-4">
                  <h3 className="font-medium text-slate-700 dark:text-slate-300">Yerel AI Motoru</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">WebGPU üzerinde çalışan yerel bir AI modeli yükler. İlk yükleme biraz zaman alabilir.</p>
                  
                  {isInitializing ? (
                    <div className="space-y-2 mt-4">
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-300 ease-out"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{progressText}</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {initError && (
                        <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{initError}</p>
                      )}
                      <button
                        onClick={handleInit}
                        className="px-4 py-2 w-full bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        AI'ı Başlat
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
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden ${
                      msg.role === 'user' 
                        ? 'bg-indigo-500 text-white rounded-br-none shadow-md' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none'
                    }`}>
                      {msg.role === 'user' ? (
                        msg.content as string
                      ) : (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.content as string}
                        </ReactMarkdown>
                      )}
                    </div>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => tts.speak(msg.content as string)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        title="Sesli Oku"
                      >
                        <Volume2 className="w-3 h-3" /> Sesli Oku
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
                    <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed overflow-hidden bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200 dark:border-slate-700 prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamingText}</ReactMarkdown>
                    </div>
                  </motion.div>
                ) : isLoading ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 text-slate-400"
                  >
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs">Düşünüyor...</span>
                  </motion.div>
                ) : null}

                {/* Orchestrator Actions */}
                {queuedActions.filter(a => a.state === 'pending' || a.state === 'executing').map(action => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl"
                  >
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 text-sm font-medium">
                      <Bot className="w-4 h-4" />
                      Aksiyon Bekliyor
                    </div>
                    <p className="text-xs text-amber-700/80 dark:text-amber-300/80 font-mono">
                      {action.toolName}
                    </p>
                    <div className="text-[10px] text-amber-600/60 dark:text-amber-400/60 break-all bg-amber-100/50 dark:bg-amber-900/40 p-1.5 rounded-lg">
                      {JSON.stringify(action.args)}
                    </div>
                    {action.state === 'pending' ? (
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => orchestrator.approveAction(action.id)}
                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          Onayla ✓
                        </button>
                        <button
                          onClick={() => orchestrator.denyAction(action.id)}
                          className="flex-1 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-400 text-xs font-medium rounded-lg transition-colors"
                        >
                          Durdur ✗
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center py-1 text-xs text-amber-600 font-medium">
                        <Loader2 className="w-3 h-3 animate-spin mr-1" /> Çalıştırılıyor...
                      </div>
                    )}
                  </motion.div>
                ))}

                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Footer (Input) - Always visible when ready */}
          {isReady && (
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              <form onSubmit={handleSubmit} className="relative flex items-center gap-2">
                {SpeechRecognition && (
                  <button
                    type="button"
                    onMouseDown={handleMouseDownMic}
                    onMouseUp={handleMouseUpMic}
                    onMouseLeave={handleMouseUpMic}
                    className={`p-2.5 rounded-xl transition-all shadow-sm flex-shrink-0 ${
                      isListening 
                        ? 'bg-red-500 text-white animate-pulse shadow-red-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                    title="Bas Konuş"
                  >
                    {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                  </button>
                )}
                <div className="relative flex-1 flex items-center">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isListening ? "Dinleniyor..." : "Bir şey sor, gezdir, analiz et..."}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 rounded-xl py-2.5 pl-4 pr-10 text-xs outline-none text-slate-800 dark:text-slate-100 placeholder-slate-400 transition-colors"
                    disabled={isLoading}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="absolute right-2 p-1.5 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors disabled:opacity-40"
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
};
