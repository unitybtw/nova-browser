import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Browser Chrome Icons ────────────────────────────────────────────────── */
const ArrowLeftIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const ArrowRightIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
);
const StarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const ShieldIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L3 7l.01 5C3 16.55 6.84 21.74 12 23c5.16-1.26 9-6.45 9-11V7L12 2z"/></svg>
);
const LockIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
);
const SparklesIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L9.5 8.5 2 11l7.5 2.5L12 21l2.5-7.5L22 11l-7.5-2.5z"/></svg>
);
const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
);
const XIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
);
const GlobeIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
);
const SendIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
);

/* ─── Simulated arXiv page content ───────────────────────────────────────── */
const ArxivContent = () => (
  <div className="bg-white text-gray-900 h-full overflow-hidden font-sans text-[12px]">
    <div className="bg-[#b31b1b] text-white px-4 py-2 flex items-center gap-4">
      <span className="font-bold text-[13px]">arXiv.org</span>
      <span className="text-red-200 text-[11px]">cs.AI</span>
      <span className="text-red-200 text-[11px]">Recent Submissions</span>
    </div>
    <div className="border-b border-gray-200 bg-gray-50 px-4 py-1.5 flex items-center gap-4 text-[10px] text-gray-600">
      <span className="text-[#b31b1b] font-medium cursor-pointer">cs.AI</span>
      <span className="cursor-pointer hover:text-gray-900">cs.LG</span>
      <span className="cursor-pointer hover:text-gray-900">cs.CV</span>
      <span className="cursor-pointer hover:text-gray-900">cs.CL</span>
      <span className="cursor-pointer hover:text-gray-900">cs.NE</span>
    </div>
    <div className="px-5 py-3 space-y-4 overflow-hidden">
      <div className="text-[10px] text-gray-500 mb-2">Showing 47 papers for Wed, 22 Aug 2026</div>
      {[
        { id: 'arXiv:2408.15311', title: 'Autonomous AI Agents with Self-Improving Memory Architecture via MCP Protocols', authors: 'Chen, L., Wang, Y., Nakamura, T., et al.', cats: ['cs.AI', 'cs.LG'] },
        { id: 'arXiv:2408.15298', title: 'Scaling Laws for Reasoning Models: Analysis at 1T+ Parameter Scale', authors: 'Patel, A., Rivera, M., Johansson, E.', cats: ['cs.AI', 'cs.CL'] },
        { id: 'arXiv:2408.15247', title: 'GPU-Accelerated Inference for Trillion-Token Context Windows in Transformer Models', authors: 'Kim, S., Zhang, W., Mueller, K., Osei, A.', cats: ['cs.LG', 'cs.AI'] },
        { id: 'arXiv:2408.15203', title: 'Zero-Shot Generalization in Large Vision-Language Models via Contrastive Pretraining', authors: 'Dubois, C., Tanaka, R., Singh, P.', cats: ['cs.CV', 'cs.AI'] },
        { id: 'arXiv:2408.15181', title: 'Constitutional AI: Training Helpful, Harmless, Honest Models with RLHF Variants', authors: 'Gutierrez, M., Park, J., Williams, S.', cats: ['cs.AI', 'cs.CL'] },
      ].map((paper, i) => (
        <div key={i} className="border-b border-gray-100 pb-3">
          <div className="flex items-start gap-2">
            <span className="text-[9px] text-gray-400 font-mono mt-0.5 shrink-0">[{i + 1}]</span>
            <div>
              <div className="text-[#b31b1b] text-[11px] font-semibold leading-snug cursor-pointer hover:underline">{paper.title}</div>
              <div className="text-gray-500 text-[10px] mt-0.5">{paper.authors}</div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {paper.cats.map(c => (
                  <span key={c} className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-[9px]">{c}</span>
                ))}
                <span className="px-1.5 py-0.5 bg-red-50 text-[#b31b1b] rounded text-[9px] font-mono">{paper.id}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

/* ─── AI Side Panel ───────────────────────────────────────────────────────── */
const AISidePanel = ({ visible }: { visible: boolean }) => {
  const messages = [
    { role: 'user', text: 'Can you summarize what makes Nova Browser special?' },
    { role: 'ai', text: '🚀 **Nova Browser** is an AI-native browser featuring:\n**Autonomous MCP Agents:** Full browser control with visual cursor feedback.\n**Zero-Knowledge Cloud Sync:** 1-click device pairing with AES-256-GCM encryption.\n**Privacy Shield:** Built-in adblocker & tracker protection.\n**Dual-View Split Screen** & customizable workspaces!' },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="absolute right-0 top-0 bottom-0 w-[290px] bg-[#0d1117] border-l border-white/10 flex flex-col z-20"
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <SparklesIcon />
              </div>
              <span className="text-white text-[12px] font-semibold">Browser AI</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-500 text-[11px]">
              <span className="cursor-pointer hover:text-white">ⓘ</span>
              <span className="cursor-pointer hover:text-white">↻</span>
              <span className="cursor-pointer hover:text-white">🗑</span>
              <span className="cursor-pointer hover:text-white">✕</span>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.7 + 0.2 }}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'user' ? (
                  <div className="bg-white text-gray-900 rounded-2xl rounded-tr-sm px-3 py-2 text-[11px] max-w-[210px] shadow-sm leading-relaxed">
                    {m.text}
                  </div>
                ) : (
                  <div className="bg-[#1a2236] text-slate-200 rounded-2xl rounded-tl-sm px-3 py-2.5 text-[10.5px] leading-relaxed max-w-[240px]">
                    {m.text.split('\n').map((line, li) => (
                      <div key={li} className={li > 0 ? 'mt-1' : ''}>
                        {line.split(/\*\*(.*?)\*\*/g).map((part, pi) =>
                          pi % 2 === 1
                            ? <strong key={pi} className="text-white">{part}</strong>
                            : <span key={pi}>{part}</span>
                        )}
                      </div>
                    ))}
                    {i === messages.length - 1 && (
                      <div className="mt-2 text-[9px] text-slate-500">🔊 Read</div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="px-3 py-2.5 border-t border-white/10 shrink-0">
            <div className="flex items-center gap-2 bg-[#1a2236] rounded-xl px-3 py-2 border border-white/10">
              <div className="w-5 h-5 rounded-lg bg-slate-700 flex items-center justify-center cursor-pointer shrink-0">
                <span className="text-slate-400 text-[10px]">🎤</span>
              </div>
              <span className="flex-1 text-[10px] text-slate-500 truncate">Ask something, navigate, analyze…</span>
              <div className="w-5 h-5 rounded-lg bg-cyan-500 flex items-center justify-center cursor-pointer shrink-0 text-white">
                <SendIcon />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── AI Cursor Overlay ───────────────────────────────────────────────────── */
const AICursor = ({ visible }: { visible: boolean }) => {
  const waypoints = [
    { x: 340, y: 160 },
    { x: 430, y: 240 },
    { x: 270, y: 310 },
    { x: 380, y: 200 },
  ];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!visible) { setIdx(0); return; }
    const t = setInterval(() => setIdx(p => (p + 1) % waypoints.length), 1800);
    return () => clearInterval(t);
  }, [visible]);

  if (!visible) return null;
  const { x, y } = waypoints[idx];

  return (
    <motion.div
      className="absolute pointer-events-none z-30"
      animate={{ x, y }}
      transition={{ type: 'spring', stiffness: 100, damping: 16 }}
    >
      <svg width="18" height="22" viewBox="0 0 18 22" className="drop-shadow-[0_0_6px_rgba(34,211,238,0.8)]">
        <path d="M0 0l6 20 4-8 8-4z" fill="#22d3ee"/>
        <path d="M0 0l6 20 4-8 8-4z" fill="none" stroke="#0a7490" strokeWidth="0.8"/>
      </svg>
      <motion.div
        animate={{ opacity: [0.2, 1, 1, 0.2] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="absolute left-4 -top-0.5 bg-cyan-400 text-black text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(34,211,238,0.5)]"
      >
        AI Agent
      </motion.div>
    </motion.div>
  );
};

/* ─── Main Component ─────────────────────────────────────────────────────── */
export const RealBrowserSandbox: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [sidePanelVisible, setSidePanelVisible] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(false);

  const BASE_WIDTH = 1100;
  const BASE_HEIGHT = 660;

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setScale(w < BASE_WIDTH ? w / BASE_WIDTH : 1);
    };
    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', handleResize);
    return () => { ro.disconnect(); window.removeEventListener('resize', handleResize); };
  }, []);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setCursorVisible(false);
      setSidePanelVisible(false);
      timers.push(setTimeout(() => setCursorVisible(true), 600));
      timers.push(setTimeout(() => setSidePanelVisible(true), 2200));
      timers.push(setTimeout(() => setCursorVisible(false), 7500));
    };
    run();
    const loop = setInterval(run, 10000);
    return () => { timers.forEach(clearTimeout); clearInterval(loop); };
  }, []);

  return (
    <div ref={containerRef} className="w-full max-w-6xl mx-auto select-none px-0 sm:px-2">
      <div
        className="rounded-2xl sm:rounded-3xl border border-white/12 shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.04)] overflow-hidden relative bg-[#0d1117]"
        style={{ height: `${Math.round(BASE_HEIGHT * scale)}px` }}
      >
        <div
          style={{
            width: `${BASE_WIDTH}px`,
            height: `${BASE_HEIGHT}px`,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          className="absolute top-0 left-0 flex flex-col"
        >
          {/* ── Window Chrome ── */}
          <div className="bg-[#0d1117] border-b border-white/8 px-3 pt-2.5 shrink-0">
            {/* Traffic lights + tabs */}
            <div className="flex items-center gap-0 mb-0">
              <div className="flex items-center gap-1.5 mr-4 shrink-0">
                <div className="w-3 h-3 rounded-full bg-[#ff5f57] shadow-[0_0_4px_rgba(255,95,87,0.5)]" />
                <div className="w-3 h-3 rounded-full bg-[#febc2e] shadow-[0_0_4px_rgba(254,188,46,0.4)]" />
                <div className="w-3 h-3 rounded-full bg-[#28c840] shadow-[0_0_4px_rgba(40,200,64,0.4)]" />
              </div>

              <div className="flex items-end gap-0.5 flex-1 overflow-hidden">
                {/* Workspace dot */}
                <div className="w-2 h-2 rounded-full bg-purple-400 mr-2 shrink-0 shadow-[0_0_6px_rgba(167,139,250,0.7)]" />

                {/* Active tab */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-[11px] bg-[#151b27] text-white max-w-[200px] shrink-0 border-t border-l border-r border-white/8">
                  <GlobeIcon />
                  <span className="truncate font-medium">arXiv / cs.AI Research</span>
                  <div className="ml-auto text-slate-500 hover:text-white cursor-pointer"><XIcon /></div>
                </div>

                {/* New tab button */}
                <div className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-600 hover:bg-white/8 cursor-pointer ml-0.5">
                  <PlusIcon />
                </div>

                <div className="ml-auto flex items-center gap-1 text-slate-600 pb-1">
                  <div className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 cursor-pointer">
                    <PlusIcon />
                  </div>
                </div>
              </div>
            </div>

            {/* Address + toolbar */}
            <div className="flex items-center gap-2 py-1.5">
              <div className="flex items-center gap-0.5 text-slate-600">
                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 transition-colors"><ArrowLeftIcon /></button>
                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 transition-colors opacity-40"><ArrowRightIcon /></button>
                <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/8 transition-colors"><RefreshIcon /></button>
              </div>

              <div className="flex-1 flex items-center gap-2 bg-[#1a2236] rounded-xl px-3 h-7 border border-white/8">
                <span className="text-emerald-400 shrink-0"><LockIcon /></span>
                <span className="text-slate-300 text-[11px] font-mono flex-1 truncate">https://arxiv.org/list/cs.AI/recent</span>
                <span className="text-slate-600 hover:text-slate-300 cursor-pointer shrink-0"><StarIcon /></span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <motion.button
                  animate={{
                    boxShadow: sidePanelVisible
                      ? '0 0 12px rgba(34,211,238,0.55), 0 0 0 1px rgba(34,211,238,0.35)'
                      : '0 0 0px rgba(34,211,238,0)',
                    backgroundColor: sidePanelVisible ? 'rgba(34,211,238,0.18)' : 'rgba(34,211,238,0.1)',
                  }}
                  className="flex items-center gap-1.5 px-2.5 h-7 rounded-lg border border-cyan-500/30 text-cyan-400 text-[11px] font-bold cursor-pointer"
                >
                  <SparklesIcon /><span>AI</span>
                </motion.button>

                <button className="w-7 h-7 flex items-center justify-center rounded-lg bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 cursor-pointer">
                  <ShieldIcon />
                </button>

                {['↓', '🧩', '👤', '≡'].map((icon, i) => (
                  <button key={i} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-white/8 text-[12px] transition-colors cursor-pointer">{icon}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Content Area ── */}
          <div className="flex-1 relative overflow-hidden">
            <motion.div
              className="absolute inset-0"
              animate={{ right: sidePanelVisible ? '290px' : '0px' }}
              transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            >
              <ArxivContent />
            </motion.div>

            <AICursor visible={cursorVisible} />
            <AISidePanel visible={sidePanelVisible} />
          </div>

          {/* ── Status bar ── */}
          <div className="flex items-center justify-between px-4 py-1 bg-[#080c14] border-t border-white/5 shrink-0">
            <span className="text-[9px] text-slate-600 font-mono">
              <span className="text-emerald-500 mr-1">●</span>23 trackers blocked · Nova Privacy Shield Active
            </span>
            <span className="text-[9px] text-slate-700 font-mono">Nova Browser 1.0 · Open Source</span>
          </div>
        </div>

        {/* Interaction shield */}
        <div className="absolute inset-0 z-40 pointer-events-auto bg-transparent" />
      </div>
    </div>
  );
};

