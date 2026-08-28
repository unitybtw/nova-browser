import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  Lock,
  Star,
  Sparkles,
  ShieldCheck,
  Puzzle,
  Settings,
  Plus,
  X,
  Search,
  Mic,
  CornerDownLeft,
  Globe,
  Terminal,
  Code2,
} from 'lucide-react';

interface TabItem {
  id: string;
  title: string;
  url: string;
  icon: 'nova' | 'github' | 'react';
}

const DEMO_TABS: TabItem[] = [
  { id: 'newtab', title: 'New Tab', url: 'nova://newtab', icon: 'nova' },
  { id: 'github', title: 'Nova Browser - GitHub', url: 'https://github.com/unitybtw/nova-browser', icon: 'github' },
  { id: 'react', title: 'React Documentation', url: 'https://react.dev', icon: 'react' },
];

const SPEED_DIALS = [
  { title: 'GitHub', domain: 'github.com/unitybtw', color: '#24292e', icon: 'github' },
  { title: 'Claude AI', domain: 'claude.ai', color: '#d97706', icon: 'ai' },
  { title: 'ChatGPT', domain: 'chatgpt.com', color: '#10a37f', icon: 'ai' },
  { title: 'Gemini', domain: 'gemini.google.com', color: '#4338ca', icon: 'ai' },
  { title: 'YouTube', domain: 'youtube.com', color: '#ef4444', icon: 'globe' },
  { title: 'MCP Bridge', domain: 'localhost:3020', color: '#0ea5e9', icon: 'terminal' },
];

export const BrowserDemo: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('newtab');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAiMode, setIsAiMode] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const activeTab = DEMO_TABS.find((t) => t.id === activeTabId) || DEMO_TABS[0];

  return (
    <div className="w-full select-none rounded-2xl border border-slate-200/90 bg-slate-100/90 p-1.5 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-2">
      {/* Window Chrome Header */}
      <div className="flex h-10 w-full items-center justify-between px-3">
        {/* macOS Traffic Lights */}
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.15)]" />
        </div>

        {/* Center Window Title */}
        <div className="font-sans text-xs font-semibold tracking-wide text-slate-500">
          Nova Browser
        </div>

        {/* Right Window Status Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10px] font-bold text-emerald-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            LIVE
          </span>
        </div>
      </div>

      {/* Main Browser Window Body */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Horizontal Tab Bar */}
        <div className="flex items-center gap-1.5 border-b border-slate-200/80 bg-slate-100/80 px-2 pt-2">
          {DEMO_TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTabId(tab.id)}
                className={`group relative flex h-9 max-w-[210px] min-w-[140px] items-center gap-2 rounded-t-lg px-3 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200/60'
                    : 'text-slate-500 hover:bg-slate-200/60 hover:text-slate-800'
                }`}
              >
                {/* Active Top Accent Line */}
                {isActive && (
                  <span className="absolute inset-x-0 top-0 h-[2px] rounded-t-lg bg-[#4338ca]" />
                )}

                {/* Tab Icon */}
                {tab.icon === 'nova' && (
                  <img src="/nova-logo-tight.png" alt="Nova" className="h-4 w-4 shrink-0 object-contain" />
                )}
                {tab.icon === 'github' && (
                  <Code2 className="h-4 w-4 shrink-0 text-slate-700" />
                )}
                {tab.icon === 'react' && (
                  <Globe className="h-4 w-4 shrink-0 text-cyan-600" />
                )}

                {/* Tab Title */}
                <span className="truncate text-left text-xs font-medium">{tab.title}</span>

                {/* Close Button */}
                <span className="ml-auto rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700">
                  <X className="h-3 w-3" />
                </span>
              </button>
            );
          })}

          {/* New Tab Button */}
          <button
            type="button"
            onClick={() => setActiveTabId('newtab')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
            title="New Tab"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Omnibox & Navigation Bar */}
        <div className="flex h-11 items-center gap-2 border-b border-slate-200/80 bg-white px-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1 text-slate-500">
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 hover:text-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 hover:text-slate-800">
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 hover:text-slate-800">
              <RotateCw className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => setActiveTabId('newtab')} className="flex h-7 w-7 items-center justify-center rounded hover:bg-slate-100 hover:text-slate-800">
              <Home className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Omnibox Address Input */}
          <div className="flex flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-700 transition-all focus-within:border-[#4338ca] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#4338ca]/20">
            <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
            <input
              type="text"
              value={activeTab.url}
              readOnly
              className="w-full bg-transparent font-mono text-[11px] text-slate-700 outline-none"
            />
            <div className="flex items-center gap-1.5 text-slate-400">
              <span className="rounded bg-slate-200/60 px-1.5 py-0.5 font-mono text-[9px] font-bold text-slate-600">
                TR/EN
              </span>
              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`rounded p-0.5 transition-colors hover:text-amber-500 ${isBookmarked ? 'text-amber-500' : 'text-slate-400'}`}
              >
                <Star className="h-3.5 w-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-1.5">
            {/* AI Assistant Pill */}
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-[11px] font-semibold text-[#4338ca] transition-colors hover:bg-indigo-100"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#4338ca]" />
              <span className="hidden sm:inline">Nova AI</span>
            </button>

            {/* Privacy Shield Badge */}
            <div className="flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Shield</span>
            </div>

            {/* Extensions & Settings */}
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <Puzzle className="h-3.5 w-3.5" />
            </button>
            <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <Settings className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Viewport Content Area */}
        <div className="h-[460px] sm:h-[520px] w-full overflow-y-auto bg-slate-50/50">
          {/* TAB 1: NEW TAB PAGE */}
          {activeTabId === 'newtab' && (
            <div className="flex min-h-full flex-col items-center justify-between p-6 text-center sm:p-10">
              {/* Header / Clock */}
              <div className="mt-2 sm:mt-6">
                <div className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight text-slate-900">
                  13:37
                </div>
                <div className="mt-1 font-mono text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Good Afternoon, Explorer
                </div>
              </div>

              {/* Central Search Box */}
              <div className="my-6 w-full max-w-xl">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.06)] ring-1 ring-slate-100 focus-within:border-[#4338ca] focus-within:ring-2 focus-within:ring-[#4338ca]/20">
                  <Search className="h-4 w-4 shrink-0 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Google or ask Nova AI with @ai..."
                    className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAiMode(!isAiMode)}
                    className={`rounded-lg px-2 py-1 font-mono text-[10px] font-bold uppercase transition-colors ${
                      isAiMode
                        ? 'bg-[#4338ca] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    @ai
                  </button>
                  <button type="button" className="text-slate-400 hover:text-slate-600">
                    <Mic className="h-4 w-4" />
                  </button>
                  <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-[#4338ca] transition-colors">
                    <CornerDownLeft className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Speed Dial Grid */}
              <div className="w-full max-w-2xl">
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
                  {SPEED_DIALS.map((dial) => (
                    <button
                      key={dial.title}
                      type="button"
                      onClick={() => {
                        if (dial.icon === 'github') setActiveTabId('github');
                      }}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-white p-3 shadow-xs transition-all hover:-translate-y-1 hover:border-slate-300 hover:shadow-md"
                    >
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-xs"
                        style={{ backgroundColor: dial.color }}
                      >
                        {dial.icon === 'github' && <Code2 className="h-5 w-5" />}
                        {dial.icon === 'ai' && <Sparkles className="h-5 w-5" />}
                        {dial.icon === 'globe' && <Globe className="h-5 w-5" />}
                        {dial.icon === 'terminal' && <Terminal className="h-5 w-5" />}
                      </div>
                      <span className="truncate text-xs font-semibold text-slate-700 group-hover:text-[#4338ca]">
                        {dial.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bottom System Status */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-slate-200/60 pt-4 font-mono text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-indigo-500" />
                  WebGPU Local AI: Ready (Llama 3.2 3B)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-500" />
                  MCP Bridge: Port 3020 Connected
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Privacy Shield: 42 Trackers Blocked
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB REPO VIEW */}
          {activeTabId === 'github' && (
            <div className="min-h-full bg-white p-6 sm:p-8 text-left">
              <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <span>unitybtw</span>
                    <span>/</span>
                    <span className="text-slate-900 font-bold text-base">nova-browser</span>
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">Public</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">The open-source sovereign AI desktop browser for the local-first web.</p>
                </div>
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700">★ Star 1,420</span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-bold text-slate-700">⑂ Fork 194</span>
                </div>
              </div>

              {/* Code Snippet */}
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-900 p-4 font-mono text-xs text-slate-200 shadow-inner">
                <div className="mb-3 flex items-center justify-between border-b border-slate-800 pb-2 text-[11px] text-slate-400">
                  <span>electron/main.ts (On-Device AI Engine & MCP Router)</span>
                  <span className="text-emerald-400">0.04ms startup</span>
                </div>
                <pre className="overflow-x-auto text-[11px] leading-relaxed text-slate-300">
{`import { initializeMCPServer, executeLocalInference } from './agent';

export async function handleLocalAgentRequest(prompt: string) {
  // 100% On-Device WebGPU execution without cloud latency or data logging
  const mcpSession = await initializeMCPServer({ port: 3020 });
  return await executeLocalInference({
    model: 'Llama-3.2-3B-Instruct',
    prompt,
    context: window.currentTabContext
  });
}`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: REACT DOCUMENTATION VIEW */}
          {activeTabId === 'react' && (
            <div className="min-h-full bg-white p-6 sm:p-8 text-left">
              <div className="border-b border-slate-200 pb-4">
                <span className="font-mono text-xs font-bold text-cyan-600 uppercase tracking-wider">Reference</span>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-900">React 19 Documentation</h2>
                <p className="mt-1 text-xs text-slate-500">Learn how Actions, Server Components, and useOptimistic work in React 19.</p>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-900 text-sm">Actions & Form States</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    React 19 includes native support for async transitions in form actions, automatically handling pending states, errors, and optimistic UI updates.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="font-bold text-slate-900 text-sm">use(Promise) & Resource Loading</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    The use API allows reading the value of resources like Promises or context directly inside components with full Suspense support.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BrowserDemo;
