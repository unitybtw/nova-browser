import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  X, 
  Keyboard, 
  Sparkles, 
  Shield, 
  ShieldCheck,
  Info, 
  ExternalLink, 
  Command, 
  Globe, 
  Lock, 
  Cpu, 
  Layers, 
  BookOpen,
  Search,
  CheckCircle2,
  Sliders,
  Terminal,
  Volume2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Wrench,
  AlertCircle
} from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { getElectronAPI } from '../utils/electronBridge';
import { copyTextToClipboard } from '../utils/clipboard';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export type HelpTab = 'help' | 'shortcuts' | 'ai' | 'privacy' | 'about';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: HelpTab;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function formatKeyForPlatform(key: string, mac: boolean): string {
  if (mac) return key;
  if (key === '⌘') return 'Ctrl';
  if (key === '⌥') return 'Alt';
  if (key === '⇧') return 'Shift';
  if (key === '^') return 'Ctrl';
  return key;
}

export const SHORTCUT_GROUPS = [
  {
    title: 'Tabs & Windows',
    shortcuts: [
      { keys: ['⌘', 'T'], desc: 'New tab' },
      { keys: ['⌘', 'N'], desc: 'New window' },
      { keys: ['⇧', '⌘', 'N'], desc: 'New Incognito tab' },
      { keys: ['⌘', 'W'], desc: 'Close active tab' },
      { keys: ['⇧', '⌘', 'T'], desc: 'Reopen closed tab' },
      { keys: ['^', 'Tab'], desc: 'Next tab' },
      { keys: ['^', '⇧', 'Tab'], desc: 'Previous tab' },
      { keys: ['⌘', '1-9'], desc: 'Switch to tab 1-9' },
    ]
  },
  {
    title: 'Navigation & Search',
    shortcuts: [
      { keys: ['⌘', 'L'], desc: 'Focus address / search bar' },
      { keys: ['⌘', 'K'], desc: 'Open Quick Search / Spotlight' },
      { keys: ['⌘', 'R'], desc: 'Reload page' },
      { keys: ['⇧', '⌘', 'R'], desc: 'Force reload (ignore cache)' },
      { keys: ['⌘', '['], desc: 'Go back' },
      { keys: ['⌘', ']'], desc: 'Go forward' },
      { keys: ['⌘', 'F'], desc: 'Find in page' },
      { keys: ['⌘', 'P'], desc: 'Print / Save as PDF' },
    ]
  },
  {
    title: 'Zoom & Display',
    shortcuts: [
      { keys: ['⌘', '+'], desc: 'Zoom in' },
      { keys: ['⌘', '-'], desc: 'Zoom out' },
      { keys: ['⌘', '0'], desc: 'Reset zoom to 100%' },
      { keys: ['^', '⌘', 'F'], desc: 'Toggle full screen' },
      { keys: ['⌘', 'S'], desc: 'Toggle vertical sidebar' },
      { keys: ['⌥', '⌘', 'I'], desc: 'Toggle Developer Tools' },
    ]
  },
  {
    title: 'Features & Tools',
    shortcuts: [
      { keys: ['⌘', 'D'], desc: 'Bookmark current tab' },
      { keys: ['⌘', 'Y'], desc: 'Open History page' },
      { keys: isMac ? ['⇧', '⌘', 'J'] : ['Ctrl', 'J'], desc: 'Open Downloads page' },
      { keys: ['⌘', ','], desc: 'Open Settings' },
      { keys: ['⇧', '⌘', 'E'], desc: 'Toggle Reader Mode' },
      { keys: ['F1'], desc: 'Open Help & Support Center' },
    ]
  }
];

export const HELP_FAQS = [
  {
    id: 'clear-cache',
    question: 'How do I clear the browser cache or force-reload a stuck tab?',
    answer: 'You can bypass the local cache for any active tab by pressing ⇧ ⌘ R (or Ctrl+Shift+R on Windows/Linux). To clear cached cookies, site data, or stored credentials across all sites, navigate to Settings > Privacy & Security > Clear Browsing Data.'
  },
  {
    id: 'zero-telemetry',
    question: 'Does Nova Browser collect telemetry or send my browsing data to remote servers?',
    answer: 'No. Nova is built on a strict zero-telemetry architecture. We run no analytics collectors, log no search queries, and track no browsing history. All databases, sessions, and bookmarks reside strictly on your local machine.'
  },
  {
    id: 'local-ai-reqs',
    question: 'How does on-device local AI work, and what are the system requirements?',
    answer: 'Nova uses WebGPU and Web-LLM to execute neural models (e.g. Llama 3.2 3B, Phi-3.5) directly on your graphics hardware. It requires an Apple Silicon chip (M1/M2/M3/M4) or a discrete GPU supporting WebGPU. No page content is transmitted over the network when using local models.'
  },
  {
    id: 'mcp-integration',
    question: 'How do I connect external developer tools via MCP (Model Context Protocol)?',
    answer: 'Nova exposes a native JSON-RPC Model Context Protocol server on http://localhost:3020. You can point Claude Desktop, Cursor, or custom automation scripts to this endpoint to interact with active tabs and extract page contexts securely.'
  },
  {
    id: 'split-workspaces',
    question: 'How do I use Split View and manage Workspaces?',
    answer: 'Drag any tab from the tab bar or sidebar directly into the viewport to create horizontal or vertical split panes. Use the Workspace dropdown in the sidebar to create dedicated contexts (e.g. Personal, Work, Research) with isolated tab groups.'
  },
  {
    id: 'blocked-content',
    question: 'Why is a specific website or video player blocked or malfunctioning?',
    answer: "Nova's Privacy Shield blocks third-party trackers, invasive ad networks, and cryptocurrency miners by default. If a site breaks due to aggressive tracker dependencies, click the Shield icon in the address bar to whitelist the site."
  }
];

export const HelpModal: React.FC<HelpModalProps> = React.memo(({
  isOpen,
  onClose,
  initialTab = 'help'
}) => {
  const [activeTab, setActiveTab] = useState<HelpTab>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');
  const [guideSearch, setGuideSearch] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
  const [webGpuStatus, setWebGpuStatus] = useState<'checking' | 'supported' | 'unsupported'>('checking');
  
  const [appVersion, setAppVersion] = useState<string>(() => {
    return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.5.2';
  });

  const [systemVersions, setSystemVersions] = useState<{
    app: string;
    electron: string;
    chrome: string;
    node: string;
    v8: string;
    platform: string;
    arch: string;
  } | null>(null);

  // Sync activeTab when initialTab prop updates
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Fetch real system versions from Electron bridge
  useEffect(() => {
    const api = getElectronAPI();
    if (api?.getAppVersion) {
      api.getAppVersion().then(ver => {
        if (ver) setAppVersion(ver);
      }).catch(() => {});
    }
    if (api?.getSystemVersions) {
      api.getSystemVersions().then(ver => {
        if (ver) setSystemVersions(ver);
      }).catch(() => {});
    }
  }, []);

  // Real WebGPU hardware support check
  useEffect(() => {
    let cancelled = false;
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu?.requestAdapter) {
      (navigator as any).gpu.requestAdapter()
        .then((adapter: any) => {
          if (!cancelled) {
            setWebGpuStatus(adapter ? 'supported' : 'unsupported');
          }
        })
        .catch(() => {
          if (!cancelled) setWebGpuStatus('unsupported');
        });
    } else {
      setWebGpuStatus('unsupported');
    }
    return () => { cancelled = true; };
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);
  useModalFocusTrap(isOpen, onClose, containerRef);

  // Filter shortcuts based on query
  const filteredShortcutGroups = useMemo(() => {
    if (!shortcutSearch.trim()) return SHORTCUT_GROUPS;
    const q = shortcutSearch.toLowerCase();
    return SHORTCUT_GROUPS.map(group => ({
      ...group,
      shortcuts: group.shortcuts.filter(sc => 
        sc.desc.toLowerCase().includes(q) || 
        sc.keys.some(k => k.toLowerCase().includes(q))
      )
    })).filter(group => group.shortcuts.length > 0);
  }, [shortcutSearch]);

  const totalShortcutsCount = useMemo(() => {
    return SHORTCUT_GROUPS.reduce((acc, g) => acc + g.shortcuts.length, 0);
  }, []);

  const filteredFaqs = useMemo(() => {
    if (!guideSearch.trim()) return HELP_FAQS;
    const q = guideSearch.toLowerCase();
    return HELP_FAQS.filter(faq => 
      faq.question.toLowerCase().includes(q) || 
      faq.answer.toLowerCase().includes(q)
    );
  }, [guideSearch]);

  const toggleFaq = useCallback((id: string) => {
    setExpandedFaq(prev => prev === id ? null : id);
  }, []);

  const handleCopyDiagnostics = useCallback(async () => {
    const diagData = {
      appVersion,
      platform: systemVersions?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'unknown'),
      arch: systemVersions?.arch || 'unknown',
      electron: systemVersions?.electron || 'unknown',
      chromium: systemVersions?.chrome || 'unknown',
      node: systemVersions?.node || 'unknown',
      v8: systemVersions?.v8 || 'unknown',
      webGpu: webGpuStatus,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    };

    const formatted = [
      '### Nova Browser Diagnostics',
      `- **App Version:** ${diagData.appVersion}`,
      `- **Platform / Arch:** ${diagData.platform} (${diagData.arch})`,
      `- **Chromium:** ${diagData.chromium}`,
      `- **Electron:** ${diagData.electron}`,
      `- **Node.js:** ${diagData.node}`,
      `- **V8 Engine:** ${diagData.v8}`,
      `- **WebGPU Acceleration:** ${diagData.webGpu}`,
      `- **Generated:** ${diagData.timestamp}`
    ].join('\n');

    const ok = await copyTextToClipboard(formatted);
    if (ok) {
      setCopiedDiagnostics(true);
      setTimeout(() => setCopiedDiagnostics(false), 2500);
    }
  }, [appVersion, systemVersions, webGpuStatus]);

  const issueReportUrl = useMemo(() => {
    const title = encodeURIComponent('[Bug]: ');
    const body = encodeURIComponent(
      `**Describe the issue:**\n\n\n` +
      `**Diagnostics:**\n` +
      `- Nova Browser: ${appVersion}\n` +
      `- OS / Arch: ${systemVersions?.platform || 'unknown'} (${systemVersions?.arch || 'unknown'})\n` +
      `- Electron: ${systemVersions?.electron || 'unknown'}\n` +
      `- Chromium: ${systemVersions?.chrome || 'unknown'}\n` +
      `- WebGPU: ${webGpuStatus}\n`
    );
    return `https://github.com/unitybtw/nova-browser/issues/new?title=${title}&body=${body}`;
  }, [appVersion, systemVersions, webGpuStatus]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6 select-auto" 
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 380, mass: 0.8 }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0f131c] border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] h-[640px] flex flex-col overflow-hidden outline-none text-slate-800 dark:text-slate-100"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#141926]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="help-modal-title" className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 leading-tight">
                    Help & Support Center
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    User guides, keyboard shortcuts, AI documentation, and system diagnostics
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-800 rounded-md bg-slate-100 dark:bg-slate-900">
                  Esc
                </kbd>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close"
                  title="Close (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-black/20 shrink-0 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('help')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'help'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-cyan-500" />
                <span>Guides & FAQ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('shortcuts')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'shortcuts'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5 text-blue-500" />
                <span>Shortcuts</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-purple-500" />
                <span>AI & MCP</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-emerald-500" />
                <span>Privacy & Security</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('about')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'about'
                    ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-white/15'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Info className="w-3.5 h-3.5 text-amber-500" />
                <span>System & About</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 modal-scroll p-6 space-y-6 overflow-y-auto text-slate-700 dark:text-slate-300">
              {/* GUIDES & FAQ */}
              {activeTab === 'help' && (
                <div className="space-y-6">
                  {/* Search FAQs */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search guides and FAQs (e.g. cache, WebGPU, MCP, split view)..."
                      value={guideSearch}
                      onChange={(e) => setGuideSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    {guideSearch && (
                      <button
                        type="button"
                        onClick={() => setGuideSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Core Feature Highlights */}
                  {!guideSearch && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                          <Layers className="w-4 h-4 text-cyan-500" />
                          <span>Split View & Workspaces</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Drag any tab into the center browsing viewport to dock side-by-side (horizontally or vertically). Group tabs into discrete workspaces in the sidebar.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                          <Command className="w-4 h-4 text-purple-500" />
                          <span>Command Palette (⌘K)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Press ⌘K or ⌘L to quickly navigate open tabs, bookmarks, browsing history, and execute quick commands with zero mouse friction.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                          <Shield className="w-4 h-4 text-emerald-500" />
                          <span>Privacy Shield & AdBlock</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Built-in request filtering automatically blocks cross-site trackers, ad networks, and cryptocurrency miners before requests touch the network.
                        </p>
                      </div>

                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-1.5">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                          <Globe className="w-4 h-4 text-blue-500" />
                          <span>Extensions & Web Store</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          Install extensions directly from the Chrome Web Store with manifest review, or load unpacked development extensions in Settings.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Frequently Asked Questions */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Frequently Asked Questions
                      </h4>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                        {filteredFaqs.length} {filteredFaqs.length === 1 ? 'topic' : 'topics'}
                      </span>
                    </div>

                    {filteredFaqs.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                        No answers found for "{guideSearch}". Try searching for shortcuts or diagnostics.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredFaqs.map((faq) => {
                          const isExpanded = expandedFaq === faq.id;
                          return (
                            <div 
                              key={faq.id}
                              className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] overflow-hidden transition-all"
                            >
                              <button
                                type="button"
                                onClick={() => toggleFaq(faq.id)}
                                className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
                              >
                                <span>{faq.question}</span>
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="px-4 pb-3 pt-1 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/50 dark:border-white/5">
                                  {faq.answer}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* KEYBOARD SHORTCUTS */}
              {activeTab === 'shortcuts' && (
                <div className="space-y-4">
                  {/* Search Shortcuts Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search shortcuts by action or key (e.g. reload, tab, zoom, devtools)..."
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200/90 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    {shortcutSearch && (
                      <button
                        type="button"
                        onClick={() => setShortcutSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        aria-label="Clear shortcut search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-0.5">
                    <span>
                      {shortcutSearch ? 'Filtered results' : 'All standard shortcuts'}
                    </span>
                    <span className="font-mono">
                      {shortcutSearch
                        ? `${filteredShortcutGroups.reduce((acc, g) => acc + g.shortcuts.length, 0)} matching`
                        : `${totalShortcutsCount} available`}
                    </span>
                  </div>

                  {filteredShortcutGroups.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      No shortcuts matching "{shortcutSearch}"
                    </div>
                  ) : (
                    filteredShortcutGroups.map((group, idx) => (
                      <div key={idx} className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          {group.title}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.shortcuts.map((sc, sIdx) => (
                            <div 
                              key={sIdx}
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 transition-colors"
                            >
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate pr-2">
                                {sc.desc}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {sc.keys.map((k, kIdx) => (
                                  <kbd 
                                    key={kIdx} 
                                    className="px-2 py-0.5 text-[11px] font-semibold bg-white dark:bg-[#191f2b] border border-slate-300 dark:border-white/15 rounded-lg shadow-xs text-slate-800 dark:text-slate-200 min-w-[22px] text-center font-mono"
                                  >
                                    {formatKeyForPlatform(k, isMac)}
                                  </kbd>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* AI & COPILOT */}
              {activeTab === 'ai' && (
                <div className="space-y-4">
                  {/* WebGPU Status Check Banner */}
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-purple-800 dark:text-purple-300">
                        <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        <span>On-Device Neural Engine (WebGPU)</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                        webGpuStatus === 'supported'
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                          : webGpuStatus === 'checking'
                          ? 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30'
                          : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
                      }`}>
                        {webGpuStatus === 'supported' && 'WebGPU Hardware Accelerated'}
                        {webGpuStatus === 'checking' && 'Checking WebGPU...'}
                        {webGpuStatus === 'unsupported' && 'WebGPU Inactive (CPU/Fallback)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Nova runs machine learning models (Phi-3.5, Llama 3.2 3B, Gemma 2) directly inside your GPU via WebGPU. All token generation happens locally on your device with 100% privacy and zero cloud server dependencies.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Using AI & Agentic Features
                    </h4>
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Terminal className="w-3.5 h-3.5 text-cyan-500" />
                          <span>1. Omnibox Quick Trigger</span>
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Type <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-cyan-600 dark:text-cyan-400">@ai</code> followed by <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Tab</kbd> in the address bar to dispatch prompts, ask web questions, or perform immediate page lookups.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                          <span>2. Interactive Copilot Sidepanel</span>
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Click the <strong>AI</strong> button in the top bar to open the sidepanel. Summarize active articles, translate languages, or ask contextual questions about the current page without navigating away.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-emerald-500" />
                          <span>3. Model Context Protocol (MCP) Server</span>
                        </p>
                        <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                          Nova includes a local Model Context Protocol JSON-RPC server listening on port 3020. Connect external agents, Cursor, or Claude Desktop to read browser state and drive automated actions safely. Manage authentication tokens in Settings.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRIVACY & SECURITY */}
              {activeTab === 'privacy' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-800 dark:text-emerald-300">
                      <Lock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Zero-Telemetry Architecture & Native Cryptography</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Nova Browser is engineered with strict sandbox isolation. Browsing history, passwords, and tab contents are stored locally using operating system keychain facilities and never leave your hardware.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">OS-Level Password Vault</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Credentials are encrypted using macOS Keychain on Apple Silicon and DPAPI on Windows for hardware-backed security.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Permission Check Isolation</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Strict sandboxing prevents background microphone, camera, or sensor fingerprinting probes without explicit user consent.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">AdBlock & Script Shield</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Hardware-accelerated content blocking strips tracking parameters and malicious scripts prior to network dispatch.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">End-to-End Encrypted Sync</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                        Cloud sync data is encrypted client-side using AES-256-GCM before transport to your private cloud storage.
                      </p>
                    </div>
                  </div>

                  {/* Binary Integrity Card */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Binary Integrity Verification</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        SHA-256
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Every official release includes a verifiable <code className="font-mono bg-slate-200 dark:bg-slate-800 px-1 rounded">SHA256SUMS.txt</code> manifest. Verify your local installation with:
                    </p>
                    <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-black/40 font-mono text-xs text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <code>sha256sum -c SHA256SUMS.txt</code>
                    </div>
                    <div className="pt-1">
                      <a
                        href="https://github.com/unitybtw/nova-browser/releases"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        <span>View Checksums on GitHub Releases</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* ABOUT & DIAGNOSTICS */}
              {activeTab === 'about' && (
                <div className="space-y-5">
                  {/* App Overview */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nova Browser</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                          v{appVersion}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Fast, privacy-first, on-device AI desktop browser built with Electron, React, and TypeScript.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyDiagnostics}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 shadow-xs transition-colors shrink-0 cursor-pointer"
                    >
                      {copiedDiagnostics ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Copy Diagnostics</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* System & Runtime Diagnostic Grid */}
                  <div className="space-y-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      System & Engine Versions
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Chromium</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {systemVersions?.chrome || '134.0.6998'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Electron</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {systemVersions?.electron || '34.3.0'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">V8 Engine</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {systemVersions?.v8 || '13.4.114'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Node.js</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {systemVersions?.node || '20.18.1'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">Platform / Arch</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {systemVersions?.platform || (typeof navigator !== 'undefined' ? navigator.platform : 'macOS')} ({systemVersions?.arch || 'arm64'})
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/10 space-y-1">
                        <span className="text-slate-400 text-[10px] uppercase font-semibold block">WebGPU Engine</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                          {webGpuStatus === 'supported' ? 'Hardware Accelerated' : 'Compatibility Mode'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions & Links */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('open-changelog'));
                        onClose();
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Release Changelog</span>
                    </button>

                    <a
                      href="https://github.com/unitybtw/nova-browser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub Repository</span>
                    </a>

                    <a
                      href={issueReportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Report an Issue</span>
                    </a>

                    <a
                      href="https://github.com/unitybtw/nova-browser/releases"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-semibold text-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>SHA-256 Checksums</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#141926]/90 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                <span>Nova Browser v{appVersion}</span>
              </span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close (Esc)
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
