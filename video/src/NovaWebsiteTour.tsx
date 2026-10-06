import React, { useEffect, useState } from 'react';
import { AbsoluteFill, Audio, Img, Sequence, continueRender, delayRender, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { ArrowUpRight, Code2, Layers3, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';

const PAPER = '#fafaf7';
const INK = '#202824';
const MUTED = '#69716c';
const BLUE = '#285be8';
const asset = (name: string) => staticFile(`website-tour/${name}`);
const ease = (x: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3);
const progress = (frame: number, start = 0, length = 30) => ease((frame - start) / length);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties }> = ({ children, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const p = progress(frame, delay, 28);
  return <div style={{ opacity: p, transform: `translateY(${(1 - p) * 28}px)`, ...style }}>{children}</div>;
};

const Shot: React.FC<{ duration: number; children: React.ReactNode; background?: string }> = ({ duration, children, background = PAPER }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 17, duration - 18, duration - 1], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return <AbsoluteFill style={{ opacity, backgroundColor: background }}>{children}</AbsoluteFill>;
};

const Heading: React.FC<{ first: string; second: string; style?: React.CSSProperties }> = ({ first, second, style }) => <h1 style={{ margin: 0, fontSize: 96, lineHeight: 1.1, fontWeight: 500, letterSpacing: '-0.04em', ...style }}>{first}<br /><span style={{ color: MUTED }}>{second}</span></h1>;
const Detail: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => <p style={{ fontSize: 29, lineHeight: 1.65, color: MUTED, margin: '28px 0 0', ...style }}>{children}</p>;

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return <Shot duration={120}>
    <Img src={asset('alpine.webp')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: progress(frame, 15, 45) * .55, transform: `scale(${1.07 - frame * .0003})`, maskImage: 'linear-gradient(to bottom, transparent 20%, black 100%)' }} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 90 }}>
      <Reveal><Img src={asset('nova-icon.svg')} style={{ width: 104, height: 104, borderRadius: 28, marginBottom: 42, boxShadow: '0 12px 30px #20282422' }} /></Reveal>
      <Reveal delay={10}><Heading first="A little more space." second="A lot more possibility." style={{ textAlign: 'center', fontSize: 116 }} /></Reveal>
      <Reveal delay={25}><Detail style={{ textAlign: 'center', marginTop: 32 }}>Meet Nova. A browser that feels like yours.</Detail></Reveal>
    </AbsoluteFill>
  </Shot>;
};

const Space: React.FC = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 8, 60);
  return <Shot duration={198}>
    <Img src={asset('alpine.webp')} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: .8, maskImage: 'linear-gradient(to bottom, transparent 15%, black 100%)' }} />
    <div style={{ position: 'absolute', top: 125, left: 130, width: 650, zIndex: 2 }}>
      <Reveal delay={5}><Heading first="Less clutter." second="More you." style={{ fontSize: 91 }} /></Reveal>
      <Reveal delay={20}><Detail style={{ maxWidth: 530 }}>Your tabs. Your workspaces.<br />Your own way to explore.</Detail></Reveal>
      <Reveal delay={35} style={{ marginTop: 46, display: 'flex', gap: 14, alignItems: 'center', color: BLUE, fontSize: 24 }}><Layers3 size={26} />A home for every idea.</Reveal>
    </div>
    <div style={{ position: 'absolute', width: 1160, right: -40, top: 286 - p * 65, transform: `perspective(1800px) rotateY(${-7 + p * 2}deg) rotateX(3deg) scale(${.95 + p * .05})`, border: '5px solid #ffffffb8', borderRadius: 20, overflow: 'hidden', boxShadow: '0 45px 100px #102a3840' }}>
      <Img src={asset('newtab.png')} style={{ width: '100%' }} />
    </div>
  </Shot>;
};

const Intelligence: React.FC = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 10, 80);
  return <Shot duration={168} background="#eaf0f9">
    <div style={{ position: 'absolute', left: 130, top: 214, width: 1000 }}>
      <Reveal><Sparkles size={58} color={BLUE} strokeWidth={1.3} /></Reveal>
      <Reveal delay={12} style={{ marginTop: 35 }}><Heading first="Big ideas." second="Local intelligence." style={{ fontSize: 93 }} /></Reveal>
      <Reveal delay={25}><Detail style={{ maxWidth: 690 }}>A capable companion in your sidebar.<br />Supported models run on your device.</Detail></Reveal>
      <Reveal delay={40} style={{ display: 'flex', alignItems: 'center', gap: 13, marginTop: 40, color: BLUE, fontSize: 24 }}><LockKeyhole size={25} />Local inference. Powered by WebGPU.</Reveal>
      <Reveal delay={50}><Detail style={{ fontSize: 19, marginTop: 27 }}>Model download and compatible hardware required.</Detail></Reveal>
    </div>
    <div style={{ position: 'absolute', top: 108 - p * 16, right: 104, width: 580, height: 844, overflow: 'hidden', border: '4px solid #ffffffba', borderRadius: 26, boxShadow: '0 30px 75px #41536f30', transform: `translateY(${(1 - p) * 40}px)` }}>
      <Img src={asset('assistant.png')} style={{ position: 'absolute', width: 1980, maxWidth: 'none', right: 0, top: 0 }} />
    </div>
  </Shot>;
};

const Sync: React.FC = () => {
  const frame = useCurrentFrame();
  const p = progress(frame, 8, 90);
  return <Shot duration={168} background="#edf1e9">
    <div style={{ position: 'absolute', left: 125, top: 230, width: 820 }}>
      <Reveal><ShieldCheck size={58} color="#67836a" strokeWidth={1.3} /></Reveal>
      <Reveal delay={12} style={{ marginTop: 35 }}><Heading first="Your world." second="Within reach." style={{ fontSize: 99 }} /></Reveal>
      <Reveal delay={25}><Detail style={{ maxWidth: 640 }}>Pair your computers with a code.<br />Keep bookmarks and passwords in sync.</Detail></Reveal>
      <Reveal delay={40} style={{ marginTop: 38, fontSize: 23, color: '#57765c' }}>Encrypted on your device · AES-256-GCM</Reveal>
    </div>
    <div style={{ position: 'absolute', right: 86, top: 125 - p * 18, width: 804, height: 848, overflow: 'hidden', borderRadius: 24, boxShadow: '0 35px 80px #29453625', transform: `scale(${.965 + p * .035})` }}>
      <Img src={asset('sync.png')} style={{ position: 'absolute', width: 2190, maxWidth: 'none', left: -696, top: -286 }} />
    </div>
  </Shot>;
};

const Open: React.FC = () => <Shot duration={126}>
  <div style={{ position: 'absolute', top: 210, left: 130, width: 1050 }}>
    <Reveal><Code2 size={56} color={BLUE} strokeWidth={1.3} /></Reveal>
    <Reveal delay={10} style={{ marginTop: 35 }}><Heading first="An open browser." second="A shared possibility." style={{ fontSize: 99 }} /></Reveal>
    <Reveal delay={25}><Detail>Free to use. Open to explore.<br />Built in the open. Licensed under MIT.</Detail></Reveal>
  </div>
  <Reveal delay={20} style={{ position: 'absolute', right: 195, top: 280 }}><Img src={asset('nova-icon.svg')} style={{ width: 340, height: 340, borderRadius: 85, boxShadow: '0 35px 70px #14252622', transform: 'rotate(-9deg)' }} /></Reveal>
</Shot>;

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  // Hold the final identity instead of fading the last frame to blank.
  return <AbsoluteFill style={{ backgroundColor: PAPER, opacity: progress(frame, 0, 18) }}>
    <Img src={asset('alpine.webp')} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: .42, maskImage: 'linear-gradient(to bottom, transparent, black)' }} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 50 }}>
      <Reveal><div style={{ display: 'flex', alignItems: 'center', gap: 32 }}><Img src={asset('nova-icon.svg')} style={{ width: 130, height: 130, borderRadius: 34 }} /><span style={{ fontSize: 176, lineHeight: 1, letterSpacing: '-.065em', fontWeight: 650 }}>nova<span style={{ color: BLUE }}>.</span></span></div></Reveal>
      <Reveal delay={15}><Detail style={{ fontSize: 40, marginTop: 38 }}>Make a little room for Nova.</Detail></Reveal>
      <Reveal delay={30} style={{ marginTop: 42, display: 'flex', alignItems: 'center', gap: 20, fontSize: 30, color: BLUE }}>nova-browser.org<ArrowUpRight size={30} /></Reveal>
      <Reveal delay={45}><Detail style={{ fontSize: 22, marginTop: 34 }}>Free for macOS, Windows & Linux</Detail></Reveal>
    </AbsoluteFill>
  </AbsoluteFill>;
};

export const NovaWebsiteTour: React.FC = () => {
  const [fontHandle] = useState(() => delayRender('Loading Nova film font'));
  useEffect(() => {
    document.fonts.load('500 96px "Nova Manrope"').then(() => continueRender(fontHandle)).catch(() => continueRender(fontHandle));
  }, [fontHandle]);
  return <AbsoluteFill style={{ backgroundColor: PAPER, color: INK, fontFamily: '"Nova Manrope", sans-serif', overflow: 'hidden' }}>
    <style>{`@font-face{font-family:"Nova Manrope";src:url("${asset('manrope.woff2')}") format("woff2");font-weight:200 800;font-display:block}`}</style>
    <Audio src={asset('score.wav')} volume={.65} />
    <Sequence from={0} durationInFrames={120}><Intro /></Sequence>
    <Sequence from={102} durationInFrames={198}><Space /></Sequence>
    <Sequence from={282} durationInFrames={168}><Intelligence /></Sequence>
    <Sequence from={432} durationInFrames={168}><Sync /></Sequence>
    <Sequence from={582} durationInFrames={126}><Open /></Sequence>
    <Sequence from={690} durationInFrames={120}><Outro /></Sequence>
    <div style={{ position: 'absolute', left: 55, top: 43, display: 'flex', alignItems: 'center', gap: 12, fontSize: 30, fontWeight: 650, letterSpacing: '-.05em' }}><Img src={asset('nova-icon.svg')} style={{ width: 33, height: 33, borderRadius: 9 }} />nova<span style={{ color: BLUE, marginLeft: -11 }}>.</span></div>
    <div style={{ position: 'absolute', bottom: 35, left: 55, fontSize: 16, color: MUTED }}>A more personal internet.</div>
    <div style={{ position: 'absolute', bottom: 35, right: 55, fontSize: 14, color: MUTED }}>NOVA BROWSER / PRODUCT FILM</div>
  </AbsoluteFill>;
};
