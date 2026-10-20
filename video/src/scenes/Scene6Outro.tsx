import React from 'react';
import { AbsoluteFill, Img, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, APPLE_MONO, MacCursor } from '../components/RealNovaWindow';

export const Scene6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 95 },
  });

  const previewRise = spring({
    frame: Math.max(0, frame - 12),
    fps,
    config: { damping: 20, stiffness: 85 },
  });

  const clicked = frame >= 72;
  const clickPulse = spring({
    frame: Math.max(0, frame - 72),
    fps,
    config: { damping: 14, stiffness: 160 },
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
          background: 'radial-gradient(circle at 50% 0%, #ffffff 0%, #f5f5f7 70%, #e9ecf1 100%)',
        }}
      />

      {/* Apple Keynote Finale Lockup */}
      <div
        style={{
          position: 'relative',
          marginTop: 78,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 20}px)`,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
          <Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 58, height: 58 }} />
          <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: '-0.055em', color: '#1d1d1f' }}>
            nova<span style={{ color: '#2563eb' }}>.</span>
          </span>
        </div>

        <h1
          style={{
            fontSize: 76,
            fontWeight: 650,
            letterSpacing: '-0.042em',
            lineHeight: 1.04,
            color: '#1d1d1f',
            margin: 0,
          }}
        >
          Make room for Nova.
        </h1>

        <p
          style={{
            fontSize: 23,
            fontWeight: 450,
            color: '#6e6e73',
            margin: '14px 0 30px 0',
            letterSpacing: '-0.015em',
          }}
        >
          Free and open source under the MIT License. Available for macOS, Windows, and Linux.
        </p>

        {/* CTA Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              padding: '15px 34px',
              borderRadius: 999,
              background: clicked ? '#1d4ed8' : '#2563eb',
              color: '#ffffff',
              fontSize: 18,
              fontWeight: 650,
              boxShadow: clicked
                ? '0 16px 38px rgba(37, 99, 235, 0.34)'
                : '0 10px 26px rgba(37, 99, 235, 0.24)',
              transform: `scale(${clicked ? 0.97 + 0.05 * clickPulse : 1})`,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span>Download Nova 1.5</span>
            <span style={{ opacity: 0.85 }}>→</span>
          </div>

          <div
            style={{
              padding: '15px 28px',
              borderRadius: 999,
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              color: '#1d1d1f',
              fontFamily: APPLE_MONO,
              fontSize: 15.5,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(15, 23, 42, 0.04)',
            }}
          >
            nova-browser.org
          </div>
        </div>
      </div>

      {/* Real Nova Browser Floating Studio Hero Frame at Bottom */}
      <div
        style={{
          position: 'absolute',
          top: 472,
          width: 1240,
          height: 760,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 40px 110px rgba(15, 23, 42, 0.15)',
          overflow: 'hidden',
          opacity: previewRise,
          transform: `translateY(${(1 - previewRise) * 48}px)`,
        }}
      >
        <Img
          src={staticFile('website-tour/workspaces-clean-light.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
        />
      </div>

      {/* macOS Cursor clicking Download button at frame 72 (33.20s) */}
      <MacCursor
        keyframes={[
          { frame: 18, x: 1180, y: 520 },
          { frame: 72, x: 835, y: 382, click: true },
        ]}
      />
    </AbsoluteFill>
  );
};
