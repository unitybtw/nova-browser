import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const APPLE_FONT = '"Nova Manrope", -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif';
export const APPLE_SERIF = 'Georgia, "Times New Roman", Times, serif';
export const APPLE_MONO = '"SF Mono", "JetBrains Mono", Menlo, monospace';

export interface CursorKeyframe {
  frame: number;
  x: number;
  y: number;
  click?: boolean;
}

export const MacCursor: React.FC<{ keyframes: CursorKeyframe[] }> = ({ keyframes }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (keyframes.length === 0) return null;

  let currentX = keyframes[0].x;
  let currentY = keyframes[0].y;

  for (let i = 0; i < keyframes.length - 1; i++) {
    const start = keyframes[i];
    const end = keyframes[i + 1];
    if (frame >= start.frame) {
      const moveSpring = spring({
        frame: Math.max(0, frame - start.frame),
        fps,
        config: { damping: 18, stiffness: 95, mass: 0.85 },
      });
      currentX = start.x + (end.x - start.x) * moveSpring;
      currentY = start.y + (end.y - start.y) * moveSpring;
    }
  }

  // Check if any click occurred recently
  let clickScale = 1;
  let rippleProgress = -1;
  for (const kf of keyframes) {
    if (kf.click) {
      const df = frame - kf.frame;
      if (df >= 0 && df <= 16) {
        rippleProgress = df / 16;
        clickScale = df < 5 ? interpolate(df, [0, 4], [1, 0.84]) : interpolate(df, [4, 12], [0.84, 1], { extrapolateRight: 'clamp' });
      }
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        left: currentX,
        top: currentY,
        zIndex: 100,
        pointerEvents: 'none',
        transform: 'translate(-4px, -3px)',
      }}
    >
      {rippleProgress >= 0 && (
        <div
          style={{
            position: 'absolute',
            left: -18,
            top: -18,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '2px solid rgba(37, 99, 235, 0.65)',
            background: 'rgba(37, 99, 235, 0.14)',
            transform: `scale(${0.35 + rippleProgress * 1.15})`,
            opacity: 1 - rippleProgress,
          }}
        />
      )}
      <svg
        width="30"
        height="36"
        viewBox="0 0 28 34"
        style={{
          transform: `scale(${clickScale})`,
          transformOrigin: '4px 4px',
          filter: 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.28))',
        }}
      >
        <path
          d="M3 2 L3 25 L9.2 19.2 L13.8 29.5 L17.6 27.7 L13 17.5 L21.5 17.5 Z"
          fill="#111827"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export const AppleCaptionHeader: React.FC<{
  eyebrow: string;
  headline: string;
  subline?: string;
  dark?: boolean;
  align?: 'center' | 'left';
}> = ({ eyebrow, headline, subline, dark = false, align = 'center' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100 },
  });

  const subEnter = spring({
    frame: Math.max(0, frame - 8),
    fps,
    config: { damping: 20, stiffness: 95 },
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        textAlign: align,
        fontFamily: APPLE_FONT,
        zIndex: 20,
      }}
    >
      <div
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 14}px)`,
          fontSize: 14,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: dark ? '#60a5fa' : '#2563eb',
          marginBottom: 10,
        }}
      >
        {eyebrow}
      </div>
      <h2
        style={{
          opacity: enter,
          transform: `translateY(${(1 - enter) * 18}px)`,
          fontSize: 54,
          fontWeight: 650,
          letterSpacing: '-0.038em',
          lineHeight: 1.08,
          color: dark ? '#f5f5f7' : '#1d1d1f',
          margin: 0,
        }}
      >
        {headline}
      </h2>
      {subline && (
        <p
          style={{
            opacity: subEnter,
            transform: `translateY(${(1 - subEnter) * 14}px)`,
            fontSize: 22,
            fontWeight: 450,
            letterSpacing: '-0.015em',
            color: dark ? '#86868b' : '#6e6e73',
            margin: '12px 0 0 0',
          }}
        >
          {subline}
        </p>
      )}
    </div>
  );
};

export const RealNovaTopChrome: React.FC<{
  dark?: boolean;
  activeTab?: number;
  urlText?: string;
  aiActive?: boolean;
  shieldActive?: boolean;
  splitActive?: boolean;
}> = ({
  dark = false,
  activeTab = 0,
  urlText = 'Search with Google or enter address',
  aiActive = false,
  shieldActive = false,
  splitActive = false,
}) => {
  const tabs = [
    { label: 'New Tab', icon: 'compass' },
    { label: 'Nova Browser - GitHub', icon: 'globe' },
    { label: 'React 19 Documentation', icon: 'globe' },
  ];

  const bgChrome = dark ? '#14161f' : '#eef1f6';
  const bgToolbar = dark ? '#1a1d28' : '#f8fafc';
  const borderCol = dark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)';
  const textPrimary = dark ? '#f1f5f9' : '#1e293b';
  const textMuted = dark ? '#94a3b8' : '#64748b';

  return (
    <div style={{ fontFamily: APPLE_FONT, userSelect: 'none' }}>
      {/* Top Tab Strip */}
      <div
        style={{
          height: 42,
          background: bgChrome,
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 10,
        }}
      >
        {/* macOS Traffic Lights */}
        <div style={{ display: 'flex', gap: 7, marginRight: 8 }}>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57', border: '0.5px solid rgba(0,0,0,0.12)' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e', border: '0.5px solid rgba(0,0,0,0.12)' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840', border: '0.5px solid rgba(0,0,0,0.12)' }} />
        </div>

        {/* Workspace Pill */}
        <div
          style={{
            padding: '4px 11px',
            borderRadius: 999,
            background: dark ? 'rgba(255,255,255,0.07)' : '#e2e8f0',
            color: textPrimary,
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#475569' }} />
          Personal
        </div>

        {/* Browser Tabs */}
        {tabs.map((t, i) => {
          const isAct = i === activeTab;
          return (
            <div
              key={t.label}
              style={{
                height: 30,
                padding: '0 14px',
                borderRadius: 9,
                background: isAct ? (dark ? '#232736' : '#ffffff') : 'transparent',
                boxShadow: isAct ? (dark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 1px 4px rgba(15,23,42,0.06)') : 'none',
                border: isAct ? `1px solid ${borderCol}` : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: isAct ? textPrimary : textMuted,
                fontSize: 12.5,
                fontWeight: isAct ? 600 : 500,
                minWidth: 155,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  border: `1.5px solid ${isAct ? '#2563eb' : textMuted}`,
                }}
              />
              <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.label}
              </span>
              <span style={{ fontSize: 11, opacity: 0.55 }}>×</span>
            </div>
          );
        })}
      </div>

      {/* Navigation & Omnibox Bar */}
      <div
        style={{
          height: 46,
          background: bgToolbar,
          borderBottom: `1px solid ${borderCol}`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 12, color: textMuted, fontSize: 14, fontWeight: 500 }}>
          <span>←</span>
          <span>→</span>
          <span>↻</span>
        </div>

        {/* Address Bar */}
        <div
          style={{
            flex: 1,
            height: 32,
            borderRadius: 999,
            background: dark ? '#11131c' : '#eef2f6',
            border: `1px solid ${borderCol}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 14px',
            gap: 10,
            color: textMuted,
            fontSize: 12.5,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{ color: urlText.startsWith('https://') ? textPrimary : textMuted, fontWeight: urlText.startsWith('https://') ? 500 : 400 }}>
            {urlText}
          </span>
        </div>

        {/* Action Pills: Split View, AI, Privacy Shield */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              background: splitActive ? 'rgba(37, 99, 235, 0.14)' : 'transparent',
              border: splitActive ? '1px solid rgba(37, 99, 235, 0.4)' : `1px solid ${borderCol}`,
              color: splitActive ? '#2563eb' : textMuted,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            Split View
          </div>

          <div
            style={{
              padding: '5px 12px',
              borderRadius: 999,
              background: aiActive ? 'rgba(37, 99, 235, 0.16)' : (dark ? 'rgba(255,255,255,0.06)' : '#e8eef9'),
              border: `1px solid ${aiActive ? '#3b82f6' : 'rgba(59, 130, 246, 0.3)'}`,
              color: dark ? '#60a5fa' : '#2563eb',
              fontSize: 11.5,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z" />
            </svg>
            <span>AI</span>
          </div>

          <div
            style={{
              padding: '5px 11px',
              borderRadius: 999,
              background: shieldActive ? 'rgba(16, 185, 129, 0.16)' : 'transparent',
              border: shieldActive ? '1px solid rgba(16, 185, 129, 0.45)' : '1px solid transparent',
              color: '#10b981',
              fontSize: 12,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Shield</span>
          </div>
        </div>
      </div>
    </div>
  );
};
