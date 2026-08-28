import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  Compass,
  Download,
  Globe,
  Home,
  Lock,
  Menu,
  Moon,
  Plus,
  RotateCw,
  Search,
  Settings,
  Shield,
  Sparkles,
  Star,
  Terminal,
  X,
  Zap,
} from 'lucide-react';

interface DemoTab {
  id: string;
  title: string;
  url: string;
  kind: 'newtab' | 'github' | 'react' | 'ai';
}

const INITIAL_TABS: DemoTab[] = [
  { id: 'newtab', title: 'New Tab', url: 'nova://newtab', kind: 'newtab' },
  { id: 'github', title: 'Nova Browser - GitHub', url: 'github.com/unitybtw/nova-browser', kind: 'github' },
  { id: 'react', title: 'React 19 Docs', url: 'react.dev/reference/react', kind: 'react' },
];

const FAVORITES = [
  { label: 'GitHub', color: '#24292e', icon: 'GH', tab: 'github' },
  { label: 'React', color: '#087ea4', icon: '⚛', tab: 'react' },
  { label: 'Local AI', color: '#6366f1', icon: '✦', tab: 'ai' },
  { label: 'MCP', color: '#0891b2', icon: '⌘', tab: 'ai' },
];

function TabIcon({ tab, className = 'h-3.5 w-3.5' }: { tab: DemoTab; className?: string }) {
  if (tab.kind === 'newtab') return <Compass className={`${className} text-cyan-400`} />;
  if (tab.kind === 'ai') return <Sparkles className={`${className} text-cyan-400`} />;
  if (tab.kind === 'github') return <span className="flex h-3.5 w-3.5 items-center justify-center rounded bg-slate-700 text-[8px] font-black text-white">GH</span>;
  return <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-cyan-500/20 text-[11px] text-cyan-300">⚛</span>;
}

export const BrowserDemo: React.FC = () => {
  const [tabs, setTabs] = useState<DemoTab[]>(INITIAL_TABS);
  const [activeTabId, setActiveTabId] = useState('newtab');
  const [query, setQuery] = useState('');
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isShieldOn, setIsShieldOn] = useState(true);
  const [isSpaceOpen, setIsSpaceOpen] = useState(false);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || tabs[0];

  const openTab = (kind: DemoTab['kind'], title: string, url: string) => {
    const existing = tabs.find((tab) => tab.kind === kind);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
    const next = { id: `${kind}-${Date.now()}`, title, url, kind };
    setTabs((current) => [...current, next]);
    setActiveTabId(next.id);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    if (value.toLowerCase().includes('react')) {
      openTab('react', 'React 19 Docs', 'react.dev/reference/react');
    } else if (value.toLowerCase().includes('github')) {
      openTab('github', 'Nova Browser - GitHub', 'github.com/unitybtw/nova-browser');
    } else {
      openTab('ai', 'Nova Local AI Copilot', 'nova://ai');
    }
    setQuery('');
  };

  const closeTab = (id: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (tabs.length === 1) return;
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (activeTabId === id) setActiveTabId(remaining[remaining.length - 1].id);
  };

  return (
    <div className="browser-demo w-full overflow-hidden rounded-[18px] border border-slate-700/80 bg-[#151122] text-slate-200 shadow-[0_30px_90px_rgba(15,23,42,0.32)]">
      <div className="flex h-[30px] items-center border-b border-white/[0.06] bg-[#110d1c] px-3">
        <div className="flex items-center gap-1.5">
          <span className="mac-btn mac-close" />
          <span className="mac-btn mac-min" />
          <span className="mac-btn mac-max" />
        </div>
        <div className="mx-auto flex items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.8)]" />
          Nova Browser
        </div>
        <span className="font-mono text-[9px] text-slate-600">LOCAL // 01</span>
      </div>

      <div className="flex h-[560px] min-h-0">
        <aside className="flex w-[222px] shrink-0 flex-col border-r border-white/[0.08] bg-[#151122] px-3 py-3">
          <form onSubmit={submitSearch} className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              aria-label="Search or type a URL"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search or type URL"
              className="h-8 w-full rounded-xl border border-white/[0.09] bg-white/[0.06] pl-8 pr-2 text-[11px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-cyan-500/60 focus:bg-white/[0.09]"
            />
          </form>

          <div className="mb-3 grid grid-cols-2 gap-1.5">
            {FAVORITES.map((favorite) => (
              <button
                key={favorite.label}
                type="button"
                onClick={() => openTab(favorite.tab as DemoTab['kind'], favorite.label, favorite.tab === 'github' ? 'github.com/unitybtw/nova-browser' : favorite.tab === 'react' ? 'react.dev' : 'nova://ai')}
                className="flex h-8 items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.045] text-[10px] text-slate-400 transition hover:border-cyan-400/30 hover:bg-white/[0.09] hover:text-white"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-md text-[8px] font-bold text-white" style={{ backgroundColor: favorite.color }}>
                  {favorite.icon}
                </span>
                {favorite.label}
              </button>
            ))}
          </div>

          <div className="relative mb-2">
            <button type="button" onClick={() => setIsSpaceOpen(!isSpaceOpen)} className="flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] font-semibold text-slate-300 transition hover:bg-white/[0.06]">
              <span className="flex h-4 w-4 items-center justify-center rounded-md bg-violet-500 text-[9px] font-bold text-white">P</span>
              <span className="flex-1 truncate">Personal</span>
              <ChevronDown className={`h-3 w-3 text-slate-500 transition ${isSpaceOpen ? 'rotate-180' : ''}`} />
            </button>
            {isSpaceOpen && (
              <div className="absolute left-0 right-0 top-9 z-20 rounded-xl border border-white/10 bg-[#211b35] p-1.5 shadow-2xl">
                <button type="button" onClick={() => setIsSpaceOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-white hover:bg-white/10"><Check className="h-3 w-3 text-cyan-400" /> Personal</button>
                <button type="button" onClick={() => setIsSpaceOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-slate-400 hover:bg-white/10"><Plus className="h-3 w-3" /> Manage spaces</button>
              </div>
            )}
          </div>

          <button type="button" onClick={() => setActiveTabId('newtab')} className="mb-2 flex h-8 w-full items-center gap-2 rounded-xl px-2 text-left text-[11px] text-slate-400 transition hover:bg-white/[0.06] hover:text-white">
            <Plus className="h-3.5 w-3.5 text-slate-500" />
            <span className="flex-1">New Tab</span>
            <span className="font-mono text-[9px] text-slate-600">⌘T</span>
          </button>

          <div className="mb-2 flex items-center gap-2 px-2 font-mono text-[9px] uppercase tracking-[0.16em] text-slate-600">
            <span className="h-px flex-1 bg-white/[0.08]" />
            Open tabs
            <span className="h-px flex-1 bg-white/[0.08]" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto pr-0.5">
            {tabs.map((tab) => {
              const active = tab.id === activeTabId;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`group flex h-8 w-full items-center gap-2 rounded-xl border px-2 text-left text-[11px] transition ${active ? 'border-white/10 bg-white/[0.11] font-medium text-white shadow-sm' : 'border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-200'}`}
                >
                  <TabIcon tab={tab} />
                  <span className="min-w-0 flex-1 truncate">{tab.title}</span>
                  <span onClick={(event) => closeTab(tab.id, event)} className={`rounded p-0.5 text-slate-600 hover:bg-red-500/20 hover:text-red-400 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <X className="h-3 w-3" />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 border-t border-white/[0.08] pt-3">
            <button type="button" onClick={() => setIsShieldOn(!isShieldOn)} className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-[10px] text-slate-400 hover:bg-white/[0.06] hover:text-white">
              <Shield className={`h-3.5 w-3.5 ${isShieldOn ? 'text-cyan-400' : 'text-slate-600'}`} />
              <span className="flex-1">Privacy Shield</span>
              <span className={`h-1.5 w-1.5 rounded-full ${isShieldOn ? 'bg-cyan-400' : 'bg-slate-600'}`} />
            </button>
            <div className="mt-1 flex items-center gap-1 px-2 font-mono text-[9px] text-slate-600">
              <Zap className="h-3 w-3 text-cyan-500" />
              42 trackers blocked
            </div>
            <div className="mt-2 flex items-center justify-between px-2 text-slate-500">
              <button type="button" className="rounded-lg p-1.5 hover:bg-white/[0.08] hover:text-white" aria-label="Settings"><Settings className="h-3.5 w-3.5" /></button>
              <button type="button" className="rounded-lg p-1.5 hover:bg-white/[0.08] hover:text-white" aria-label="Downloads"><Download className="h-3.5 w-3.5" /></button>
              <button type="button" className="rounded-lg p-1.5 hover:bg-white/[0.08] hover:text-white" aria-label="Theme"><Moon className="h-3.5 w-3.5" /></button>
              <button type="button" className="rounded-lg p-1.5 hover:bg-white/[0.08] hover:text-white" aria-label="Menu"><Menu className="h-3.5 w-3.5" /></button>
            </div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col bg-[#0f0c18]">
          <div className="flex h-[43px] items-center gap-2 border-b border-white/[0.08] bg-[#171225] px-3">
            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.08] hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /></button>
            <button type="button" className="rounded-lg p-1.5 text-slate-600 hover:bg-white/[0.08] hover:text-white"><ArrowRight className="h-3.5 w-3.5" /></button>
            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.08] hover:text-white"><RotateCw className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => setActiveTabId('newtab')} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.08] hover:text-white"><Home className="h-3.5 w-3.5" /></button>
            <form onSubmit={submitSearch} className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.055] px-3 focus-within:border-cyan-500/60 focus-within:bg-white/[0.08]">
              <Lock className="h-3 w-3 shrink-0 text-emerald-400" />
              <input aria-label="Current page address" value={query || activeTab.url} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-slate-300 outline-none" />
              <button type="button" onClick={() => setIsBookmarked(!isBookmarked)} className={`rounded p-1 ${isBookmarked ? 'text-amber-400' : 'text-slate-500 hover:text-slate-200'}`}><Star className="h-3 w-3" fill={isBookmarked ? 'currentColor' : 'none'} /></button>
            </form>
            <button type="button" onClick={() => openTab('ai', 'Nova Local AI Copilot', 'nova://ai')} className="flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-cyan-400/20"><Sparkles className="h-3 w-3" /> AI</button>
            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.08] hover:text-white"><Terminal className="h-3.5 w-3.5" /></button>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            {activeTab.kind === 'newtab' && (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="mb-8 flex items-center gap-2 text-cyan-300"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10"><Compass className="h-4 w-4" /></span><span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em]">Nova workspace</span></div>
                <div className="font-mono text-5xl font-light tracking-[-0.08em] text-white">13:37</div>
                <p className="mt-2 text-[11px] text-slate-500">Good afternoon, Explorer</p>
                <form onSubmit={submitSearch} className="mt-8 flex w-full max-w-md items-center gap-2 rounded-2xl border border-white/[0.1] bg-white/[0.055] p-2 shadow-2xl focus-within:border-cyan-400/50">
                  <Search className="ml-2 h-4 w-4 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search or ask Nova AI..." className="min-w-0 flex-1 bg-transparent px-1 text-xs text-white outline-none placeholder:text-slate-600" /><button type="submit" className="rounded-xl bg-cyan-500 px-3 py-2 font-mono text-[10px] font-bold text-slate-950 hover:bg-cyan-400">GO</button>
                </form>
                <div className="mt-8 grid grid-cols-4 gap-2">
                  {FAVORITES.map((favorite) => <button type="button" key={favorite.label} onClick={() => openTab(favorite.tab as DemoTab['kind'], favorite.label, favorite.tab === 'github' ? 'github.com/unitybtw/nova-browser' : favorite.tab === 'react' ? 'react.dev' : 'nova://ai')} className="flex w-20 flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-3 text-[10px] text-slate-500 hover:border-cyan-400/30 hover:text-white"><span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs text-white" style={{ backgroundColor: favorite.color }}>{favorite.icon}</span>{favorite.label}</button>)}
                </div>
              </div>
            )}
            {activeTab.kind === 'github' && <div className="h-full overflow-auto bg-[#11101a] p-8 text-left"><div className="flex items-center gap-2 text-xs text-slate-500"><span>unitybtw</span><span>/</span><strong className="text-white">nova-browser</strong><span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px]">Public</span></div><h2 className="mt-5 text-2xl font-semibold tracking-tight text-white">The sovereign browser for the local-first web.</h2><p className="mt-2 max-w-xl text-xs leading-relaxed text-slate-500">On-device AI, native tracker blocking, and developer-grade workspaces without sending your thinking to the cloud.</p><div className="mt-8 rounded-xl border border-white/10 bg-[#090a10] p-4 font-mono text-[10px] leading-6 text-slate-400"><span className="text-cyan-400">const</span> nova = <span className="text-violet-300">await</span> createLocalBrowser();<br /><span className="text-slate-600">// WebGPU inference. Zero cloud transmission.</span><br />nova.privacyShield.enable();</div></div>}
            {activeTab.kind === 'react' && <div className="h-full overflow-auto bg-[#11101a] p-8 text-left"><span className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-400">Reference</span><h2 className="mt-3 text-2xl font-semibold text-white">React 19 Documentation</h2><p className="mt-2 max-w-lg text-xs leading-relaxed text-slate-500">Actions, Server Components, and the latest patterns for building resilient interfaces.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><h3 className="text-xs font-semibold text-white">Actions & form states</h3><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Async transitions, pending states, and optimistic updates built into the platform.</p></div><div className="rounded-xl border border-white/10 bg-white/[0.035] p-4"><h3 className="text-xs font-semibold text-white">use(Promise)</h3><p className="mt-2 text-[11px] leading-relaxed text-slate-500">Read resources directly inside components with full Suspense support.</p></div></div></div>}
            {activeTab.kind === 'ai' && <div className="h-full overflow-auto bg-[#11101a] p-8 text-left"><div className="flex items-center gap-3 border-b border-white/10 pb-5"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><Sparkles className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-white">Nova Local Copilot</h2><p className="mt-1 font-mono text-[9px] text-emerald-400">WEBGPU // ZERO CLOUD TRANSMISSION</p></div></div><div className="mt-7 ml-auto max-w-sm rounded-2xl bg-cyan-500 px-4 py-3 text-xs text-slate-950">Explain how WebGPU on-device inference works in Nova Browser.</div><div className="mt-4 max-w-lg rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-relaxed text-slate-300"><p className="mb-3 font-mono text-[9px] font-bold text-cyan-400">LOCAL MODEL // 64 TOK/S</p>Nova executes quantized WebLLM neural weights directly in the client shader pipeline. Your tabs, passwords, and search sessions never leave the device.</div></div>}
          </div>
        </main>
      </div>
    </div>
  );
};

export default BrowserDemo;
