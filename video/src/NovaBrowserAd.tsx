import React from 'react';
import {
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const FONT = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
const MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
const CYAN = '#67e8f9';
const INDIGO = '#818cf8';
const GREEN = '#6ee7b7';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const progress = (frame: number, start: number, end: number) =>
  clamp(interpolate(frame, [start, end], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));

const fade = (frame: number, start: number, end: number, exitStart?: number, exitEnd?: number) => {
  const enter = progress(frame, start, end);
  if (exitStart === undefined || exitEnd === undefined) return enter;
  return enter * (1 - progress(frame, exitStart, exitEnd));
};

type AdProps = {
  format?: 'landscape' | 'vertical';
};

type BrowserFrameProps = {
  mode: 'intro' | 'ai' | 'split' | 'privacy' | 'tabs';
  vertical: boolean;
  frame: number;
  scale: number;
};

const TrafficLights: React.FC = () => (
  <div style={{ display: 'flex', gap: 7 }}>
    {['#fb7185', '#fbbf24', '#34d399'].map((color) => (
      <span key={color} style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 12px ${color}55` }} />
    ))}
  </div>
);

const BrowserTab: React.FC<{ title: string; active?: boolean; accent?: string }> = ({ title, active, accent = CYAN }) => (
  <div
    style={{
      height: 34,
      minWidth: 150,
      maxWidth: 220,
      padding: '0 13px',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      borderRadius: '9px 9px 0 0',
      background: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.045)',
      border: `1px solid ${active ? `${accent}80` : 'rgba(255,255,255,0.08)'}`,
      borderBottom: active ? `2px solid ${accent}` : '1px solid rgba(255,255,255,0.08)',
      color: active ? '#f8fafc' : '#94a3b8',
      fontFamily: MONO,
      fontSize: 11,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  >
    <span style={{ width: 8, height: 8, borderRadius: 2, background: accent, boxShadow: `0 0 10px ${accent}` }} />
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
  </div>
);

const AddressBar: React.FC<{ value: string; secure?: boolean }> = ({ value, secure = true }) => (
  <div
    style={{
      flex: 1,
      height: 35,
      display: 'flex',
      alignItems: 'center',
      gap: 9,
      padding: '0 14px',
      borderRadius: 10,
      background: 'rgba(2,6,23,0.7)',
      border: '1px solid rgba(148,163,184,0.18)',
      color: '#94a3b8',
      fontFamily: MONO,
      fontSize: 11,
      overflow: 'hidden',
    }}
  >
    <span style={{ color: secure ? GREEN : '#fbbf24', fontSize: 13 }}>{secure ? '◉' : '◈'}</span>
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
    <span style={{ marginLeft: 'auto', color: '#64748b' }}>⌘ L</span>
  </div>
);

const NewTabContent: React.FC<{ vertical: boolean }> = ({ vertical }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      background: 'radial-gradient(circle at 50% 35%, rgba(67,56,202,0.22), transparent 48%), #0b1220',
      padding: vertical ? 36 : 54,
    }}
  >
    <div style={{ position: 'absolute', inset: 0, opacity: 0.2, backgroundImage: 'linear-gradient(rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.09) 1px, transparent 1px)', backgroundSize: '42px 42px' }} />
    <div style={{ position: 'relative', color: '#f8fafc', fontFamily: FONT, fontSize: vertical ? 58 : 72, fontWeight: 300, letterSpacing: '0.04em' }}>10:42</div>
    <div style={{ position: 'relative', marginTop: 10, color: '#94a3b8', fontFamily: MONO, fontSize: 12 }}>WEDNESDAY / AUGUST 27</div>
    <div style={{ position: 'relative', marginTop: 36, width: 'min(560px, 85%)', height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderRadius: 13, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: '#64748b', fontFamily: MONO, fontSize: 12 }}>
      <span style={{ color: CYAN }}>⌕</span>
      <span>Search web or ask @ai...</span>
      <span style={{ marginLeft: 'auto', color: '#475569' }}>↵</span>
    </div>
    <div style={{ position: 'relative', marginTop: 28, display: 'flex', gap: 10, fontFamily: MONO, fontSize: 10, color: '#64748b' }}>
      <span style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(103,232,249,0.08)', color: CYAN }}>LOCAL FIRST</span>
      <span style={{ padding: '7px 10px', borderRadius: 7, background: 'rgba(129,140,248,0.08)', color: INDIGO }}>OPEN SOURCE</span>
    </div>
  </div>
);

const AIPanel: React.FC<{ frame: number; vertical: boolean }> = ({ frame, vertical }) => {
  const localFrame = frame - 140;
  const panelIn = progress(localFrame, 0, 22);
  const typed = Math.floor(interpolate(localFrame, [45, 125], [0, 118], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const response = 'This page explains how local inference keeps your prompts on-device. Nova can summarize the current tab without sending your browsing context to a cloud model.';
  return (
    <div
      style={{
        width: vertical ? '100%' : '38%',
        minWidth: vertical ? undefined : 330,
        height: '100%',
        padding: vertical ? 22 : 28,
        boxSizing: 'border-box',
        background: 'linear-gradient(145deg, rgba(30,27,75,0.98), rgba(15,23,42,0.98))',
        borderLeft: vertical ? 'none' : `1px solid ${INDIGO}55`,
        borderTop: vertical ? `1px solid ${INDIGO}55` : 'none',
        transform: `translateX(${(1 - panelIn) * (vertical ? 0 : 36)}px)`,
        opacity: panelIn,
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 30, height: 30, filter: 'drop-shadow(0 0 12px #818cf8)' }} />
        <div>
          <div style={{ color: '#f8fafc', fontWeight: 800, fontSize: 15 }}>Nova AI</div>
          <div style={{ color: GREEN, fontFamily: MONO, fontSize: 9 }}>LOCAL / WEBGPU</div>
        </div>
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: GREEN, boxShadow: `0 0 12px ${GREEN}` }} />
      </div>
      <div style={{ marginTop: 22, alignSelf: 'flex-end', maxWidth: '92%', padding: '12px 14px', borderRadius: '14px 14px 3px 14px', background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: '#fff', fontSize: 12, lineHeight: 1.45 }}>
        Summarize this page locally.
      </div>
      <div style={{ marginTop: 14, padding: '13px 14px', borderRadius: '14px 14px 14px 3px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1', fontSize: 12, lineHeight: 1.55 }}>
        {response.slice(0, typed)}<span style={{ color: CYAN, opacity: frame % 16 < 8 ? 1 : 0 }}>▌</span>
      </div>
      <div style={{ marginTop: 'auto', paddingTop: 18, color: '#64748b', fontFamily: MONO, fontSize: 9 }}>No API key · No cloud request · Current tab context</div>
    </div>
  );
};

const SplitContent: React.FC<{ frame: number }> = ({ frame }) => {
  const reveal = progress(frame - 320, 0, 32);
  return (
    <div style={{ flex: 1, minWidth: 0, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(103,232,249,0.45)' }}>
      <div style={{ minWidth: 0, padding: 30, background: '#101827', color: '#e2e8f0', fontFamily: FONT }}>
        <div style={{ color: CYAN, fontFamily: MONO, fontSize: 10, marginBottom: 22 }}>REACT DOCS / REFERENCE</div>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>useMemo</div>
        <div style={{ height: 9, width: '82%', borderRadius: 5, background: '#334155', marginBottom: 10 }} />
        <div style={{ height: 9, width: '64%', borderRadius: 5, background: '#334155', marginBottom: 28 }} />
        {[0, 1, 2, 3, 4].map((line) => <div key={line} style={{ height: 6, width: `${72 - line * 8}%`, borderRadius: 4, background: line === 2 ? `${CYAN}99` : '#1e3a55', marginBottom: 13 }} />)}
      </div>
      <div style={{ minWidth: 0, padding: 30, background: '#0b1220', color: '#cbd5e1', fontFamily: MONO, opacity: reveal, transform: `translateX(${(1 - reveal) * 30}px)` }}>
        <div style={{ color: GREEN, fontSize: 10, marginBottom: 22 }}>NOVA / SPLIT CANVAS</div>
        <div style={{ color: '#f8fafc', fontFamily: FONT, fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Compare without context switching.</div>
        <div style={{ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11, lineHeight: 1.8 }}>
          <div style={{ color: INDIGO }}>await nova.splitView.attachTab(tab2);</div>
          <div style={{ color: '#64748b' }}>syncScroll: true</div>
          <div style={{ color: GREEN }}>memoryIsolation: active</div>
        </div>
      </div>
    </div>
  );
};

const PrivacyOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const reveal = progress(frame - 500, 0, 24);
  const blocked = Math.floor(interpolate(frame - 500, [28, 110], [0, 148], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 24, pointerEvents: 'none', opacity: reveal }}>
      <div style={{ width: 250, padding: 18, borderRadius: 15, background: 'rgba(6,78,59,0.96)', border: `1px solid ${GREEN}99`, boxShadow: `0 0 40px ${GREEN}33`, color: '#ecfdf5', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <span style={{ width: 30, height: 30, display: 'grid', placeItems: 'center', borderRadius: 9, background: `${GREEN}22`, color: GREEN, fontSize: 18 }}>✓</span>
          <div><div style={{ fontWeight: 800, fontSize: 14 }}>Privacy Shield</div><div style={{ color: GREEN, fontFamily: MONO, fontSize: 9 }}>ACTIVE PROTECTION</div></div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: '#a7f3d0' }}>TRACKERS BLOCKED</div>
        <div style={{ marginTop: 4, fontSize: 38, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{blocked}</div>
        <div style={{ marginTop: 10, height: 5, borderRadius: 9, background: `${GREEN}33`, overflow: 'hidden' }}><div style={{ width: `${Math.min(100, blocked / 1.48)}%`, height: '100%', background: GREEN }} /></div>
      </div>
    </div>
  );
};

const VerticalTabs: React.FC<{ frame: number }> = ({ frame }) => {
  const reveal = progress(frame - 650, 0, 28);
  const tabs = ['Research / AI papers', 'Tailwind CSS v4', 'React 19 docs', 'Spotify / focus mix', 'Nova project'];
  return (
    <div style={{ width: 184, flexShrink: 0, padding: 16, background: '#0f172a', borderRight: `1px solid ${INDIGO}55`, opacity: reveal, transform: `translateX(${(1 - reveal) * -24}px)`, fontFamily: MONO }}>
      <div style={{ color: INDIGO, fontSize: 10, letterSpacing: '0.1em', marginBottom: 20 }}>WORKSPACE / DEV</div>
      {tabs.map((tab, index) => <div key={tab} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 8px', marginBottom: 7, borderRadius: 8, background: index === 4 ? `${INDIGO}22` : 'transparent', border: index === 4 ? `1px solid ${INDIGO}66` : '1px solid transparent', color: index === 4 ? '#fff' : '#94a3b8', fontSize: 10 }}><span style={{ width: 7, height: 7, borderRadius: 2, background: index === 4 ? CYAN : '#475569' }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tab}</span></div>)}
      <div style={{ marginTop: 22, padding: 9, borderRadius: 8, background: `${GREEN}12`, color: GREEN, fontSize: 9 }}>3 dormant tabs sleeping</div>
    </div>
  );
};

const BrowserFrame: React.FC<BrowserFrameProps> = ({ mode, vertical, frame, scale }) => {
  const width = vertical ? 920 : 1460;
  const height = vertical ? 900 : 650;
  const showAi = mode === 'ai';
  const showSplit = mode === 'split';
  const showPrivacy = mode === 'privacy';
  const showTabs = mode === 'tabs';
  return (
    <div style={{ position: 'absolute', left: '50%', top: vertical ? 360 : 245, width, height, transform: `translateX(-50%) scale(${scale})`, transformOrigin: 'top center', borderRadius: 22, overflow: 'hidden', background: '#0b1220', border: '1px solid rgba(148,163,184,0.35)', boxShadow: '0 40px 100px rgba(0,0,0,0.6), 0 0 80px rgba(67,56,202,0.2)', fontFamily: FONT }}>
      <div style={{ height: 44, display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', background: '#172235', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <TrafficLights />
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 6, height: '100%', paddingTop: 10, overflow: 'hidden' }}>
          {!showTabs && <><BrowserTab title="Nova new tab" active /><BrowserTab title="GitHub / Nova Browser" /></>}
          {showTabs && <BrowserTab title="Research session · 5 tabs" active accent={INDIGO} />}
        </div>
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 24, height: 24 }} />
      </div>
      <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', background: '#111b2d', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: '#64748b', fontSize: 18 }}>‹</span><span style={{ color: '#64748b', fontSize: 18 }}>›</span><AddressBar value={showAi ? 'nova://newtab · ask @ai' : showSplit ? 'react.dev/reference/react' : 'https://github.com/unitybtw/nova-browser'} />
        <span style={{ color: '#94a3b8', fontFamily: MONO, fontSize: 12 }}>⋮</span>
      </div>
      <div style={{ height: `calc(100% - 96px)`, display: 'flex' }}>
        {showTabs && <VerticalTabs frame={frame} />}
        {showSplit ? <SplitContent frame={frame} /> : <NewTabContent vertical={vertical} />}
        {showAi && <AIPanel frame={frame} vertical={vertical} />}
      </div>
      {showPrivacy && <PrivacyOverlay frame={frame} />}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 14px', background: 'rgba(2,6,23,0.85)', color: '#64748b', fontFamily: MONO, fontSize: 9 }}><span>Nova Browser · local runtime</span><span style={{ color: GREEN }}>● protected</span></div>
    </div>
  );
};

export const NovaBrowserAd: React.FC<AdProps> = ({ format = 'landscape' }) => {
  const frame = useCurrentFrame();
  const { width, height, durationInFrames } = useVideoConfig();
  const vertical = format === 'vertical' || height > width;
  const t = frame / durationInFrames;
  const browserScale = vertical ? 0.98 : Math.min(1, width / 1920);
  const mode = t < 0.15 ? 'intro' : t < 0.34 ? 'ai' : t < 0.52 ? 'split' : t < 0.70 ? 'privacy' : 'tabs';
  const introOpacity = fade(t, 0, 0.08, 0.12, 0.17);
  const featureOpacity = fade(t, 0.13, 0.19, 0.67, 0.72);
  const ctaOpacity = progress(t, 0.78, 0.9);
  const browserOpacity = 0.35 + featureOpacity * 0.65;
  const browserScaleOut = 1 - progress(t, 0.76, 0.95) * 0.06;
  const logoIn = spring({ frame: Math.max(0, frame - 6), fps: 60, config: { damping: 14, stiffness: 110 } });
  const caption = mode === 'intro' ? 'A browser built for your actual workflow.' : mode === 'ai' ? 'Ask your browser. Keep context local.' : mode === 'split' ? 'Two pages. One synchronized canvas.' : mode === 'privacy' ? 'The web, without the clutter.' : 'More tabs. Less noise.';
  const eyebrow = mode === 'intro' ? 'NOVA BROWSER' : mode === 'ai' ? 'LOCAL AI / WEBGPU' : mode === 'split' ? 'SPATIAL WORKSPACES' : mode === 'privacy' ? 'PRIVACY SHIELD' : 'TAB CONTROL';

  return (
    <div style={{ position: 'relative', width, height, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1e1b4b 0%, #080d19 45%, #020617 100%)', color: '#f8fafc', fontFamily: FONT }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.55, backgroundImage: 'linear-gradient(rgba(129,140,248,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(129,140,248,0.07) 1px, transparent 1px)', backgroundSize: vertical ? '52px 52px' : '72px 72px', transform: `translateY(${(frame * 0.35) % 72}px)` }} />
      <div style={{ position: 'absolute', width: vertical ? 620 : 920, height: vertical ? 620 : 920, borderRadius: '50%', left: '50%', top: '42%', transform: 'translate(-50%,-50%)', background: 'radial-gradient(circle, rgba(67,56,202,0.24), transparent 68%)', filter: 'blur(30px)' }} />

      <div style={{ position: 'absolute', top: vertical ? 100 : 72, left: 0, right: 0, zIndex: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: introOpacity, transform: `translateY(${(1 - introOpacity) * 18}px)` }}>
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: vertical ? 74 : 62, height: vertical ? 74 : 62, transform: `scale(${logoIn})`, filter: 'drop-shadow(0 0 30px rgba(103,232,249,0.7))' }} />
        <div style={{ marginTop: 18, color: CYAN, fontFamily: MONO, fontSize: vertical ? 14 : 13, letterSpacing: '0.24em', fontWeight: 700 }}>SOVEREIGN COMPUTING</div>
        <h1 style={{ margin: '14px 0 0', fontSize: vertical ? 48 : 66, lineHeight: 0.98, letterSpacing: '-0.05em', fontWeight: 900, background: 'linear-gradient(135deg,#fff 15%,#a5f3fc 55%,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>NOVA BROWSER</h1>
      </div>

      <BrowserFrame mode={mode} vertical={vertical} frame={frame} scale={browserScale * browserScaleOut} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: vertical ? 116 : 62, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', opacity: ctaOpacity > 0 ? ctaOpacity : featureOpacity, transform: `translateY(${(1 - Math.max(ctaOpacity, featureOpacity)) * 12}px)` }}>
        <div style={{ color: ctaOpacity > 0 ? GREEN : CYAN, fontFamily: MONO, fontSize: vertical ? 12 : 13, letterSpacing: '0.18em', fontWeight: 700 }}>{ctaOpacity > 0 ? 'DOWNLOAD NOVA TODAY' : eyebrow}</div>
        <div style={{ marginTop: 10, maxWidth: vertical ? 850 : 1100, padding: '0 24px', fontSize: vertical ? 34 : 48, lineHeight: 1.05, fontWeight: 850, letterSpacing: '-0.04em' }}>{ctaOpacity > 0 ? 'Your web. Your context. Your machine.' : caption}</div>
        {ctaOpacity > 0 && <div style={{ marginTop: 22, padding: '13px 25px', borderRadius: 999, background: '#f8fafc', color: '#0f172a', fontFamily: MONO, fontSize: 13, fontWeight: 800, letterSpacing: '0.1em' }}>OPEN SOURCE · LOCAL AI · ZERO CLOUD CONTEXT</div>}
      </div>

      <div style={{ position: 'absolute', top: 28, right: 34, zIndex: 6, color: '#64748b', fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em' }}>NOVA / 01</div>
    </div>
  );
};

export const NovaBrowserAdShorts: React.FC = (props) => <NovaBrowserAd {...props} format="vertical" />;
