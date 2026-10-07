import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { DeviceMotion, FrameLines, LogoTrace, PlatformMotion, SourceMotion, WordReveal, WorkspaceMotion } from './components/TourMotion';

const PAPER = '#fafaf7';
const INK = '#202824';
const MUTED = '#69716c';
const BLUE = '#285be8';
const asset = (name: string) => staticFile(`website-tour/${name}`);
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const progress = (frame: number, start = 0, length = 30) => ease((frame - start) / length);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({ children, delay = 0, style }) => {
  const p = progress(useCurrentFrame(), delay, 30);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 20}px)`, ...style }}>{children}</div>;
};

const Shot: React.FC<{ duration: number; children: React.ReactNode; background?: string }> = ({ duration, children, background = PAPER }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 18, duration - 19, duration - 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity, backgroundColor: background }}>{children}</AbsoluteFill>;
};

const Identity: React.FC<{ ending?: boolean }> = ({ ending = false }) => <AbsoluteFill style={{ backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center', opacity: progress(useCurrentFrame()) }}>
  <FrameLines ending={ending} />
  <Reveal style={{ position: 'relative' }}><div style={{ display: 'flex', alignItems: 'center', gap: 30 }}><LogoTrace /><span style={{ fontSize: 164, letterSpacing: '-.065em', fontWeight: 650 }}>nova<span style={{ color: BLUE }}>.</span></span></div></Reveal>
  <h1 style={{ position: 'relative', fontSize: 70, letterSpacing: '-.04em', lineHeight: 1.2, fontWeight: 500, margin: '38px 0 0' }}><WordReveal text={ending ? 'Make room for Nova.' : 'A browser that feels like yours.'} delay={14} /></h1>
  <Reveal delay={24}><p style={{ color: ending ? BLUE : MUTED, fontSize: 27, marginTop: 30 }}>{ending ? 'nova-browser.org' : 'A clean start. Your own way to explore.'}</p></Reveal>
  {ending && <Reveal delay={35}><p style={{ fontSize: 22, color: MUTED, marginTop: 28 }}>Free for macOS, Windows & Linux</p></Reveal>}
</AbsoluteFill>;

const Product: React.FC<{ assistant?: boolean }> = ({ assistant = false }) => {
  const frame = useCurrentFrame();
  const settle = progress(frame, 12, 65);
  const zoom = interpolate(frame, [0, 270], [1, 1.018], { extrapolateRight: 'clamp' });
  return <Shot duration={288} background={assistant ? '#edf2fa' : '#f2f5ef'}>
    <div style={{ position: 'absolute', left: 104, top: 116, right: 104, display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
      <Reveal><h1 style={{ fontSize: 57, lineHeight: 1.18, letterSpacing: '-.035em', fontWeight: 500, margin: 0 }}>{assistant ? 'A little help, right where you are.' : 'A clearer view of your day.'}</h1></Reveal>
      <Reveal delay={14}><p style={{ fontSize: 21, color: MUTED, margin: '0 0 8px', textAlign: 'right', lineHeight: 1.5 }}>{assistant ? 'Local models · WebGPU' : 'Clean mode · Flexible tabs · Workspaces'}</p></Reveal>
    </div>
    {assistant ? <DeviceMotion /> : <WorkspaceMotion />}
    <div style={{ position: 'absolute', left: 336, top: 242 + (1 - settle) * 25, width: 1248, height: 780, borderRadius: 18, overflow: 'hidden', border: '1px solid #c7d0dc', boxShadow: '0 18px 48px #25314118', opacity: progress(frame, 8), transform: `scale(${zoom})`, transformOrigin: 'center center' }}>
      <Img src={asset(assistant ? 'assistant-clean-light.jpg' : 'workspaces-clean-light.jpg')} style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
    </div>
    {assistant && <div style={{ position: 'absolute', right: 50, bottom: 18, color: MUTED, fontSize: 14 }}>Model download and compatible hardware required.</div>}
  </Shot>;
};

const Open: React.FC = () => <Shot duration={213}>
  <AbsoluteFill style={{ justifyContent: 'center', padding: '0 180px' }}>
    <Reveal><p style={{ color: BLUE, fontSize: 24, letterSpacing: '.08em', marginBottom: 32 }}>BUILT IN THE OPEN</p></Reveal>
    <Reveal delay={10}><h1 style={{ fontSize: 100, letterSpacing: '-.045em', fontWeight: 500, lineHeight: 1.16, margin: 0 }}>Yours to use.<br /><span style={{ color: MUTED }}>Open to explore.</span></h1></Reveal>
    <Reveal delay={22}><p style={{ fontSize: 30, color: MUTED, marginTop: 38 }}>Free. Open source. Licensed under MIT.</p></Reveal>
    <PlatformMotion />
  </AbsoluteFill>
  <SourceMotion />
</Shot>;

export const NovaWebsiteTour: React.FC = () => {
  const frame = useCurrentFrame();
  const chapters = ['Introduction', 'Your workspaces', 'Local intelligence', 'Open source', 'Make room'];
  const chapter = frame < 165 ? 0 : frame < 435 ? 1 : frame < 705 ? 2 : frame < 900 ? 3 : 4;
  const [fontHandle] = useState(() => delayRender('Loading Nova film font'));
  useEffect(() => {
    document.fonts.load('500 96px "Nova Manrope"').then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle));
  }, [fontHandle]);
  return <AbsoluteFill style={{ backgroundColor: PAPER, color: INK, fontFamily: '"Nova Manrope", sans-serif', overflow: 'hidden' }}>
    <style>{`@font-face{font-family:"Nova Manrope";src:url("${asset('manrope.woff2')}") format("woff2");font-weight:200 800;font-display:block}`}</style>
    <Audio src={asset('narration.m4a')} />
    <Audio src={asset('score.wav')} volume={frame => interpolate(frame, [0, 30, 990, 1080], [0, .18, .18, 0], { extrapolateRight: 'clamp' })} />
    <Sequence from={0} durationInFrames={183}><Identity /></Sequence>
    <Sequence from={165} durationInFrames={288}><Product /></Sequence>
    <Sequence from={435} durationInFrames={288}><Product assistant /></Sequence>
    <Sequence from={705} durationInFrames={213}><Open /></Sequence>
    <Sequence from={900} durationInFrames={180}><Identity ending /></Sequence>
    <div style={{ position: 'absolute', left: 52, top: 36, display: 'flex', alignItems: 'center', gap: 11, fontSize: 27, fontWeight: 650, letterSpacing: '-.05em' }}><Img src={asset('nova-icon.svg')} style={{ width: 30, height: 30 }} />nova<span style={{ color: BLUE, marginLeft: -10 }}>.</span></div>
    <div style={{ position: 'absolute', top: 43, right: 52, fontSize: 14, letterSpacing: '.08em', color: MUTED }}>{`0${chapter + 1} / ${chapters[chapter].toUpperCase()}`}<div style={{ height: 2, marginTop: 14, width: 220, backgroundColor: '#d5ded6', marginLeft: 'auto' }}><div style={{ height: '100%', backgroundColor: BLUE, width: `${frame / 1079 * 100}%` }} /></div></div>
  </AbsoluteFill>;
};
