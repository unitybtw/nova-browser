import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  X, 
  Keyboard, 
  Sparkles, 
  Shield, 
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
  Volume2
} from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

const GithubIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'help' | 'shortcuts' | 'ai' | 'privacy' | 'about';
}

const SHORTCUT_GROUPS = [
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
      { keys: ['⇧', '⌘', 'J'], desc: 'Open Downloads page' },
      { keys: ['⌘', ','], desc: 'Open Settings' },
      { keys: ['F1'], desc: 'Open Help Center' },
    ]
  }
];

export const HelpModal: React.FC<HelpModalProps> = React.memo(({
  isOpen,
  onClose,
  initialTab = 'help'
}) => {
  const [activeTab, setActiveTab] = useState<'help' | 'shortcuts' | 'ai' | 'privacy' | 'about'>(initialTab);
  const [shortcutSearch, setShortcutSearch] = useState('');
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-4 sm:p-6" 
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 400 }}
            ref={containerRef}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#11141d] border border-slate-200/80 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden outline-none"
            tabIndex={-1}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#151924]/90 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    Nova Browser Help & Documentation
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Keyboard shortcuts, AI features, and user guide
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/40 dark:bg-black/20 shrink-0 overflow-x-auto no-scrollbar">
              <button
                onClick={() => setActiveTab('help')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'help'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Guide</span>
              </button>

              <button
                onClick={() => setActiveTab('shortcuts')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'shortcuts'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Shortcuts</span>
              </button>

              <button
                onClick={() => setActiveTab('ai')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'ai'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI & Copilot</span>
              </button>

              <button
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Privacy</span>
              </button>

              <button
                onClick={() => setActiveTab('about')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'about'
                    ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>About</span>
              </button>
            </div>

            {/* Tab Body with Custom Scrollbar */}
            <div className="flex-1 modal-scroll p-6 space-y-6 text-slate-700 dark:text-slate-300">
              {/* GUIDE & OVERVIEW */}
              {activeTab === 'help' && (
                <div className="space-y-5">
                  <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold text-slate-900 dark:text-cyan-300">Welcome to Nova Browser</h4>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                        Nova combines next-generation privacy, local WebGPU AI models, Model Context Protocol (MCP), and split-screen workflows into a blazing fast modern browser.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Layers className="w-4 h-4 text-cyan-500" />
                        <span>Split View & Workspaces</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Drag any tab into the browser area to split screen horizontally or vertically. Organize tabs into distinct Workspaces.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Command className="w-4 h-4 text-purple-500" />
                        <span>Command Palette (⌘K)</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Press ⌘K or ⌘L to quickly search open tabs, history, bookmarks, or run commands with instant keyboard navigation.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Shield className="w-4 h-4 text-emerald-500" />
                        <span>Privacy Shield & AdBlock</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Built-in engine blocks trackers, banner ads, and malware scripts automatically without third-party extensions.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Globe className="w-4 h-4 text-blue-500" />
                        <span>Chrome Extensions</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Install Chrome extensions directly from the Chrome Web Store or load unpacked development extensions.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Volume2 className="w-4 h-4 text-amber-500" />
                        <span>Reader Mode & Voice TTS</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Distraction-free article reader mode with native OS speech synthesis to read web articles aloud.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1.5">
                      <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-white">
                        <Sliders className="w-4 h-4 text-rose-500" />
                        <span>Themes & Customization</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                        Customize accent colors, vertical tab styles, start page animations (Nebula, Cyber Grid, Aurora Waves), and dark themes.
                      </p>
                    </div>
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
                      placeholder="Search shortcuts (e.g. tab, zoom, reload, find)..."
                      value={shortcutSearch}
                      onChange={(e) => setShortcutSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {filteredShortcutGroups.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
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
                              className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10"
                            >
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                {sc.desc}
                              </span>
                              <div className="flex items-center gap-1">
                                {sc.keys.map((k, kIdx) => (
                                  <kbd 
                                    key={kIdx} 
                                    className="px-2 py-0.5 text-[11px] font-semibold bg-white dark:bg-[#1a202c] border border-slate-300 dark:border-white/15 rounded-lg shadow-xs text-slate-800 dark:text-slate-200 min-w-[22px] text-center font-mono"
                                  >
                                    {k}
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
                  <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-purple-700 dark:text-purple-300">
                      <Cpu className="w-4 h-4" />
                      <span>On-Device Local AI (Web-LLM) & Cloud Models</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Nova Browser runs deep learning models directly on your device GPU using WebGPU, ensuring 100% privacy without sending web content to cloud servers.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      How to use AI Features
                    </h4>
                    <div className="space-y-2.5">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">1. Address Bar Quick Trigger</p>
                        <p className="text-slate-500 dark:text-slate-400">Type <code className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono text-cyan-600 dark:text-cyan-400">@ai</code> followed by <kbd className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono">Tab</kbd> in the address bar to ask the AI assistant immediately.</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">2. Side Panel Copilot</p>
                        <p className="text-slate-500 dark:text-slate-400">Click the <strong>AI</strong> pill in the top bar to open the side panel for full-page summaries, interactive Q&A, and translations.</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 text-xs space-y-1">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">3. Model Context Protocol (MCP)</p>
                        <p className="text-slate-500 dark:text-slate-400">Connect local tools, SQLite, code interpreters, and external agents directly to Nova Browser via standard MCP JSON-RPC on port 3020.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PRIVACY & SECURITY */}
              {activeTab === 'privacy' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-sm text-emerald-700 dark:text-emerald-300">
                      <Lock className="w-4 h-4" />
                      <span>Security & Zero-Telemetry Architecture</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Nova Browser is designed with strict sandbox isolation. It does not track your browsing history, record search queries, or send telemetry to external servers.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Encrypted Password Vault</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Passwords and credentials are encrypted using macOS Keychain / Windows DPAPI OS-level native cryptography.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Permission Check Isolation</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Strict permission checks block background microphone/camera probing and fingerprinting exploits.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">AdBlock & Tracking Shield</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Hardware-accelerated adblocker strips tracking queries and malicious scripts before network execution.</p>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 space-y-1">
                      <p className="font-bold text-slate-800 dark:text-slate-200">Zero-Knowledge 1-Click Sync</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Multi-device synchronization encrypted with client-side AES-256-GCM keys.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ABOUT */}
              {activeTab === 'about' && (
                <div className="space-y-5 text-center py-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 p-2 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                    <img src="/nova-icon.png" alt="Nova Browser" className="w-full h-full object-contain" />
                  </div>
                  
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Nova Browser</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Version 1.0.7 (Chromium & Electron Architecture)</p>
                    <p className="text-xs text-cyan-600 dark:text-cyan-400 font-medium font-mono">Fast • AI-Powered • Private</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 max-w-md mx-auto text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Designed and built with modern web technologies: React, TypeScript, Tailwind CSS, Electron, Web-LLM, and Model Context Protocol.
                  </div>

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href="https://github.com/unitybtw/nova-browser"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                    >
                      <GithubIcon className="w-4 h-4" />
                      <span>GitHub Repository</span>
                    </a>
                    <a
                      href="https://github.com/unitybtw/nova-browser/issues"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-colors cursor-pointer border border-slate-200 dark:border-white/10"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Report Issue</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50/90 dark:bg-[#151924]/90 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Nova Browser Help Center
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
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
