import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const logoRotate = interpolate(frame, [0, 180], [0, 10]);

  const titleOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [15, 35], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeOpacity = interpolate(frame, [60, 80], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        zIndex: 10,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Animated Glowing Badge */}
      <div
        style={{
          opacity: badgeOpacity,
          transform: 'translateY(-20px)',
          padding: '8px 24px',
          borderRadius: '9999px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.4)',
          backdropFilter: 'blur(16px)',
          color: '#22d3ee',
          fontSize: 18,
          fontWeight: 700,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          marginBottom: 32,
          boxShadow: '0 0 30px rgba(6, 182, 212, 0.25)',
        }}
      >
        Open Source High-Performance Browser
      </div>

      {/* Center 3D Glowing Compass / Nova Core Icon */}
      <div
        style={{
          transform: `scale(${logoScale}) rotate(${logoRotate}deg)`,
          width: 140,
          height: 140,
          borderRadius: 36,
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(6, 182, 212, 0.5), 0 0 100px rgba(59, 130, 246, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          marginBottom: 36,
        }}
      >
        <svg width="74" height="74" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>

      {/* Main Brand Title */}
      <h1
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 86,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: 0,
          background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 4px 30px rgba(0,0,0,0.5)',
        }}
      >
        Nova Browser
      </h1>

      {/* Tagline */}
      <p
        style={{
          opacity: subtitleOpacity,
          fontSize: 32,
          fontWeight: 400,
          color: '#94a3b8',
          maxWidth: 900,
          marginTop: 18,
          lineHeight: 1.4,
        }}
      >
        Engineered for <span style={{ color: '#38bdf8', fontWeight: 600 }}>Pure Speed</span>,{' '}
        <span style={{ color: '#a855f7', fontWeight: 600 }}>Local AI</span> &amp;{' '}
        <span style={{ color: '#10b981', fontWeight: 600 }}>Total Privacy</span>
      </p>
    </div>
  );
};
