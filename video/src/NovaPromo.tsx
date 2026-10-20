import React, { useEffect, useState } from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Series,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { Scene1Intro } from './scenes/Scene1Intro';
import { Scene2Speed } from './scenes/Scene2Speed';
import { Scene3AI } from './scenes/Scene3AI';
import { Scene4Privacy } from './scenes/Scene4Privacy';
import { Scene5Workflow } from './scenes/Scene5Workflow';
import { Scene6Outro } from './scenes/Scene6Outro';
import { APPLE_FONT } from './components/RealNovaWindow';

const SceneTransitionEnvelope: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 12, durationInFrames - 12, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const NovaPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = frame / fps;

  const [fontHandle] = useState(() => delayRender('Loading Nova Apple-style studio font'));
  useEffect(() => {
    document.fonts
      .load('600 72px "Nova Manrope"')
      .then(() => continueRender(fontHandle))
      .catch(() => continueRender(fontHandle));
  }, [fontHandle]);

  const chapters = [
    {
      start: 0.0,
      end: 5.6,
      label: '01 / DESIGNED FOR FOCUS',
      caption: 'Meet Nova. A browser designed around focus, speed, and your own space.',
      dark: false,
    },
    {
      start: 5.6,
      end: 11.8,
      label: '02 / WORKSPACES & COMMAND',
      caption: 'Organize your day with vertical tabs, isolated workspaces, and an instant command bar.',
      dark: false,
    },
    {
      start: 11.8,
      end: 18.2,
      label: '03 / SPLIT VIEW & MEMORY',
      caption: 'Work side by side in Split View, while inactive tabs quietly hibernate to save memory.',
      dark: false,
    },
    {
      start: 18.2,
      end: 25.0,
      label: '04 / LOCAL WEBGPU AI',
      caption: 'Ask Nova Assistant anything. Powered by WebGPU, local models run right on your device.',
      dark: true,
    },
    {
      start: 25.0,
      end: 30.8,
      label: '05 / PRIVACY SHIELD & SYNC',
      caption: 'Built-in protection blocks trackers automatically, and end-to-end encryption keeps your sync private.',
      dark: true,
    },
    {
      start: 30.8,
      end: 36.0,
      label: '06 / OPEN SOURCE',
      caption: 'Free and open source for Mac, Windows, and Linux. Make room for Nova.',
      dark: false,
    },
  ];

  const activeChapter =
    chapters.find((c) => t >= c.start && t < c.end) ?? chapters[chapters.length - 1];

  const isDark = activeChapter.dark;
  const progressPct = Math.min(100, Math.max(0, (frame / Math.max(1, durationInFrames - 1)) * 100));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: isDark ? '#0a0a0c' : '#f5f5f7',
        fontFamily: APPLE_FONT,
        overflow: 'hidden',
      }}
    >
      <style>{`@font-face{font-family:"Nova Manrope";src:url("${staticFile('website-tour/manrope.woff2')}") format("woff2");font-weight:200 800;font-display:block}`}</style>

      {/* English Female Narration (en-US-AvaNeural) + Apple Keynote Studio Score & Real UI Click/Typing SFX */}
      <Audio src={staticFile('promo-master-en.m4a')} />

      {/* Minimalist Apple Studio Top Bar */}
      <div
        style={{
          position: 'absolute',
          top: 28,
          left: 48,
          right: 48,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 26, height: 26 }} />
          <span
            style={{
              color: isDark ? '#f5f5f7' : '#1d1d1f',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.045em',
            }}
          >
            nova<span style={{ color: '#2563eb' }}>.</span>
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 7 }}>
          <div
            style={{
              color: isDark ? '#a1a1aa' : '#6e6e73',
              fontSize: 12,
              fontWeight: 650,
              letterSpacing: '0.1em',
            }}
          >
            {activeChapter.label}
          </div>
          <div
            style={{
              width: 200,
              height: 2,
              borderRadius: 999,
              background: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                background: '#2563eb',
                borderRadius: 999,
              }}
            />
          </div>
        </div>
      </div>

      {/* 6-Scene Apple Keynote Film Timeline (36.0s = 1080 frames @ 30fps) */}
      <Series>
        {/* Scene 1: Studio Light Reveal & Real New Tab (0.0s - 5.6s = 168 frames) */}
        <Series.Sequence durationInFrames={168}>
          <SceneTransitionEnvelope durationInFrames={168}>
            <Scene1Intro />
          </SceneTransitionEnvelope>
        </Series.Sequence>

        {/* Scene 2: Real Vertical Tabs, Workspaces & Cmd+K Spotlight (5.6s - 11.8s = 186 frames) */}
        <Series.Sequence durationInFrames={186}>
          <SceneTransitionEnvelope durationInFrames={186}>
            <Scene2Speed />
          </SceneTransitionEnvelope>
        </Series.Sequence>

        {/* Scene 3: Side-by-Side Split View & Smart Tab Hibernation (11.8s - 18.2s = 192 frames) */}
        <Series.Sequence durationInFrames={192}>
          <SceneTransitionEnvelope durationInFrames={192}>
            <Scene5Workflow />
          </SceneTransitionEnvelope>
        </Series.Sequence>

        {/* Scene 4: Apple Pro Dark & Real Nova AI Sidebar (18.2s - 25.0s = 204 frames) */}
        <Series.Sequence durationInFrames={204}>
          <SceneTransitionEnvelope durationInFrames={204}>
            <Scene3AI />
          </SceneTransitionEnvelope>
        </Series.Sequence>

        {/* Scene 5: Real Privacy Shield Popover & Encrypted Sync Modal (25.0s - 30.8s = 174 frames) */}
        <Series.Sequence durationInFrames={174}>
          <SceneTransitionEnvelope durationInFrames={174}>
            <Scene4Privacy />
          </SceneTransitionEnvelope>
        </Series.Sequence>

        {/* Scene 6: Studio Light Finale & Download CTA (30.8s - 36.0s = 156 frames) */}
        <Series.Sequence durationInFrames={156}>
          <SceneTransitionEnvelope durationInFrames={156}>
            <Scene6Outro />
          </SceneTransitionEnvelope>
        </Series.Sequence>
      </Series>

      {/* Subtle Apple Frosted Glass Caption Pill */}
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          zIndex: 40,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            padding: '9px 24px',
            borderRadius: 999,
            background: isDark ? 'rgba(20, 20, 25, 0.82)' : 'rgba(255, 255, 255, 0.88)',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(15,23,42,0.09)',
            boxShadow: '0 8px 26px rgba(15, 23, 42, 0.12)',
            color: isDark ? '#f5f5f7' : '#1d1d1f',
            fontSize: 16.5,
            fontWeight: 550,
            letterSpacing: '-0.01em',
          }}
        >
          {activeChapter.caption}
        </div>
      </div>
    </AbsoluteFill>
  );
};
