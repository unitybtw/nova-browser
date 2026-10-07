import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Cpu, Folder, Layers3, Monitor, Search, Terminal } from 'lucide-react';

const BLUE = '#285be8';
const INK = '#202824';
const MUTED = '#69716c';
const clamp = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };
const reveal = (frame: number, delay = 0, duration = 36) => interpolate(frame, [delay, delay + duration], [0, 1], clamp);

export const WordReveal: React.FC<{ text: string; delay?: number; style?: React.CSSProperties }> = ({ text, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <div style={{ display: 'flex', gap: '.25em', justifyContent: 'center', ...style }}>{text.split(' ').map((word, i) => {
    const p = spring({ frame: frame - delay - i * 5, fps, config: { damping: 24, stiffness: 130, mass: .8 } });
    return <span key={`${word}-${i}`} style={{ overflow: 'hidden', display: 'inline-block', paddingBottom: '.1em' }}><span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 110}%)`, opacity: reveal(frame, delay + i * 5, 12) }}>{word}</span></span>;
  })}</div>;
};

export const LogoTrace: React.FC = () => {
  const frame = useCurrentFrame();
  const p = reveal(frame, 3, 42);
  const fill = reveal(frame, 28, 28);
  return <svg width="132" height="132" viewBox="0 0 160 160" style={{ overflow: 'visible' }}>
    <rect x="5" y="5" width="150" height="150" rx="34" fill={INK} fillOpacity={fill} stroke={INK} strokeWidth="1.6" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    <path d="M80 25 C80 56 56 80 25 80 C56 80 80 104 80 135 C80 104 104 80 135 80 C104 80 80 56 80 25Z" fill="white" fillOpacity={fill} stroke={fill > .5 ? 'white' : BLUE} strokeWidth="1.3" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    <circle cx="80" cy="80" r="5" fill={BLUE} opacity={fill} />
  </svg>;
};

export const FrameLines: React.FC<{ ending?: boolean }> = ({ ending = false }) => {
  const frame = useCurrentFrame();
  const p = reveal(frame, 14, 65);
  return <svg viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    {[0, 1, 2].map(i => <rect key={i} x={310 + i * 32} y={220 + i * 30} width={1300 - i * 64} height={670 - i * 60} rx="32" fill="none" stroke={ending && i === 2 ? '#285be835' : '#d5ded680'} strokeWidth="1" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal(frame, 14 + i * 12, 65)} />)}
    <path d="M170 770 H250 Q280 770 280 740 V380 Q280 350 310 350" fill="none" stroke={BLUE} strokeOpacity=".3" strokeWidth="1.5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    <circle cx="170" cy="770" r="4" fill={BLUE} opacity={p} />
    <path d="M1750 320 H1670 Q1640 320 1640 350 V760 Q1640 790 1610 790" fill="none" stroke={BLUE} strokeOpacity=".3" strokeWidth="1.5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    <circle cx="1750" cy="320" r="4" fill={BLUE} opacity={p} />
  </svg>;
};

export const WorkspaceMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const labels = ['Personal', 'Work', 'Research'];
  const Icons = [Search, Layers3, Folder];
  return <div style={{ position: 'absolute', left: 52, top: 412, width: 246 }}>
    <div style={{ color: MUTED, fontSize: 14, letterSpacing: '.12em', marginBottom: 22, opacity: reveal(frame, 20) }}>A PLACE FOR EVERY PROJECT</div>
    {labels.map((label, i) => {
      const p = spring({ frame: frame - 24 - i * 18, fps, config: { damping: 23, stiffness: 110 } });
      const active = frame > 100 && i === 1;
      const Icon = Icons[i];
      return <div key={label} style={{ height: 75, marginBottom: 13, backgroundColor: active ? '#e5ecff' : '#ffffffd9', border: `1px solid ${active ? '#a9bdf0' : '#d5ded6'}`, borderRadius: 13, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', color: active ? BLUE : INK, fontSize: 22, transform: `translateX(${(1 - p) * -70}px)`, opacity: reveal(frame, 24 + i * 18, 15) }}><Icon size={23} strokeWidth={1.4} />{label}<span style={{ marginLeft: 'auto', fontSize: 13, color: MUTED }}>0{i + 1}</span></div>;
    })}
    <svg width="286" height="56" style={{ marginTop: 7, overflow: 'visible' }}><path d="M8 12 H208 Q236 12 236 -16 V-80 Q236 -104 260 -104 H284" fill="none" stroke={BLUE} strokeOpacity=".5" strokeWidth="1.5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal(frame, 90, 55)} /><circle cx="8" cy="12" r="3" fill={BLUE} opacity={reveal(frame, 90)} /></svg>
  </div>;
};

export const DeviceMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const p = reveal(frame, 80, 60);
  return <div style={{ position: 'absolute', left: 1623, top: 435, width: 245, textAlign: 'center', opacity: reveal(frame, 68, 25), transform: `translateY(${(1 - reveal(frame, 68, 40)) * 20}px)` }}>
    <svg width="245" height="210" viewBox="0 0 245 210">
      <path d="M0 108 H49 Q64 108 64 92 V70 Q64 55 79 55 H103" stroke={BLUE} strokeWidth="1.6" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
      <rect x="87" y="36" width="80" height="80" rx="17" fill="#fafcff" stroke="#a6b9e7" strokeWidth="1.5" />
      <foreignObject x="108" y="56" width="42" height="42"><Cpu color={BLUE} size={40} strokeWidth={1.2} /></foreignObject>
      <path d="M127 116 V148 Q127 164 143 164 H212" stroke={BLUE} strokeWidth="1.6" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal(frame, 120, 50)} />
      <circle cx={interpolate(frame, [90, 155], [4, 57], clamp)} cy="108" r="3.5" fill={BLUE} opacity={interpolate(frame, [85, 100, 145, 160], [0, 1, 1, 0], clamp)} />
      <circle cx="212" cy="164" r="4" fill={BLUE} opacity={reveal(frame, 150, 15)} />
    </svg>
    <div style={{ fontSize: 24, color: INK, marginTop: -20 }}>On your device.</div>
    <div style={{ fontSize: 17, lineHeight: 1.6, color: MUTED, marginTop: 10 }}>Local inference<br />Powered by WebGPU</div>
  </div>;
};

export const SourceMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const p = reveal(frame, 15, 60);
  return <svg width="430" height="390" viewBox="0 0 430 390" style={{ position: 'absolute', right: 160, top: 330 }}>
    <rect x="20" y="20" width="390" height="330" rx="25" fill="#f1f4ef" stroke="#d5ded6" strokeWidth="1.5" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    <path d="M20 79 H410" stroke="#d5ded6" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - p} />
    {[0, 1, 2].map(i => <circle key={i} cx={48 + i * 21} cy="50" r="4" fill={i === 0 ? BLUE : '#bcc8c0'} opacity={reveal(frame, 20 + i * 8)} />)}
    <path d="M154 131 L121 164 L154 197 M275 131 L308 164 L275 197 M235 121 L195 207" stroke={BLUE} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - reveal(frame, 35, 45)} />
    {[220, 135, 184].map((width, i) => <rect key={i} x="76" y={242 + i * 22} width={width * reveal(frame, 75 + i * 12, 35)} height="5" rx="2.5" fill={i === 1 ? '#9bb3ef' : '#c4cfc7'} />)}
  </svg>;
};

export const PlatformMotion: React.FC = () => {
  const frame = useCurrentFrame();
  const Icons = [Monitor, Monitor, Terminal];
  return <div style={{ display: 'flex', gap: 15, marginTop: 38 }}>{['macOS', 'Windows', 'Linux'].map((label, i) => {
    const Icon = Icons[i];
    const p = reveal(frame, 50 + i * 16, 28);
    return <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '17px 24px', border: '1px solid #d5ded6', borderRadius: 12, backgroundColor: '#fff', fontSize: 21, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}><Icon size={22} color={BLUE} strokeWidth={1.3} />{label}</div>;
  })}</div>;
};
