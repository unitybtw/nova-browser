import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, MacCursor } from '../components/RealNovaWindow';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerEnter = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 95 },
  });

  const browserRise = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 20, stiffness: 82, mass: 1.05 },
  });

  // Top-anchored macro camera dolly so the browser never overlaps the headline
  const cameraZoom = interpolate(frame, [0, 55, 168], [1, 1.01, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const searchFocused = frame >= 72;
  const focusGlow = spring({
    frame: Math.max(0, frame - 72),
    fps,
    config: { damping: 16, stiffness: 130 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f5f5f7',
        fontFamily: APPLE_FONT,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f5f5f7 68%, #ebedf0 100%)',
        }}
      />

      {/* Editorial Header */}
      <div
        style={{
          position: 'relative',
          marginTop: 54,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 18}px)`,
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '5px 15px',
            borderRadius: 999,
            background: '#ffffff',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            marginBottom: 14,
          }}
        >
          <Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 18, height: 18 }} />
          <span style={{ fontSize: 13, fontWeight: 650, letterSpacing: '-0.01em', color: '#1d1d1f' }}>
            Nova Browser 1.5
          </span>
          <span style={{ color: '#cbd5e1' }}>|</span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: '#2563eb' }}>Built for Focus</span>
        </div>

        <h1
          style={{
            fontSize: 64,
            fontWeight: 650,
            letterSpacing: '-0.042em',
            lineHeight: 1.05,
            color: '#1d1d1f',
            margin: 0,
          }}
        >
          A browser that feels like <span style={{ color: '#2563eb' }}>yours.</span>
        </h1>
        <p
          style={{
            fontSize: 21,
            fontWeight: 450,
            color: '#6e6e73',
            marginTop: 10,
            letterSpacing: '-0.015em',
          }}
        >
          Clean start page. Native speed. Local intelligence right where you work.
        </p>
      </div>

      {/* Real Nova Browser Window Container (Top-Anchored Transform Origin) */}
      <div
        style={{
          position: 'absolute',
          top: 244,
          width: 1360,
          height: 850,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.11)',
          boxShadow: '0 40px 110px rgba(15, 23, 42, 0.14), 0 12px 32px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          opacity: browserRise,
          transform: `translateY(${(1 - browserRise) * 55}px) scale(${(0.96 + 0.04 * browserRise) * cameraZoom})`,
          transformOrigin: '50% 0%',
        }}
      >
        <Img
          src={staticFile('website-tour/newtab-clean-light.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
        />

        {/* Exact-aligned Focus Ring over New Tab Search Input (x:362, y:471, w:636, h:54) */}
        {searchFocused && (
          <div
            style={{
              position: 'absolute',
              left: 362,
              top: 471,
              width: 636,
              height: 54,
              borderRadius: 14,
              border: '2px solid rgba(37, 99, 235, 0.7)',
              boxShadow: `0 0 0 ${4 * focusGlow}px rgba(37, 99, 235, 0.15), 0 10px 24px rgba(37, 99, 235, 0.08)`,
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              padding: '0 18px',
              gap: 12,
              opacity: focusGlow,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span style={{ color: '#1d1d1f', fontSize: 15.5, fontWeight: 500 }}>
              {'react.dev/reference/react'.slice(
                0,
                Math.floor(interpolate(frame, [78, 138], [0, 25], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
              )}
            </span>
            <span
              style={{
                width: 2,
                height: 19,
                background: '#2563eb',
                opacity: frame % 14 < 7 ? 1 : 0,
              }}
            />
            <span
              style={{
                marginLeft: 'auto',
                padding: '4px 10px',
                borderRadius: 8,
                background: '#eff6ff',
                color: '#2563eb',
                fontSize: 11.5,
                fontWeight: 650,
              }}
            >
              Shield Active
            </span>
          </div>
        )}

        <MacCursor
          keyframes={[
            { frame: 25, x: 960, y: 620 },
            { frame: 72, x: 540, y: 498, click: true },
            { frame: 130, x: 680, y: 498 },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
