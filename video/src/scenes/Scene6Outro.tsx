import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const buttonGlow = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.3, 0.7]);

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
      {/* Center 3D Glowing Compass / Nova Icon */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          width: 120,
          height: 120,
          borderRadius: 32,
          background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 20px 60px rgba(6, 182, 212, 0.5), 0 0 80px rgba(59, 130, 246, 0.3)',
          border: '2px solid rgba(255, 255, 255, 0.3)',
          marginBottom: 28,
        }}
      >
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
      </div>

      <h2
        style={{
          fontSize: 72,
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          letterSpacing: '-0.03em',
        }}
      >
        Upgrade Your Browsing Experience
      </h2>

      <p
        style={{
          fontSize: 28,
          color: '#94a3b8',
          maxWidth: 800,
          marginTop: 16,
          marginBottom: 40,
        }}
      >
        Ultra-fast, completely open-source, and engineered for the modern web.
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div
          style={{
            padding: '18px 48px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#ffffff',
            fontSize: 24,
            fontWeight: 700,
            boxShadow: `0 10px 40px rgba(6, 182, 212, ${buttonGlow})`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span>Download Nova Browser</span>
        </div>

        <div
          style={{
            padding: '18px 36px',
            borderRadius: 18,
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#e2e8f0',
            fontSize: 22,
            fontWeight: 600,
            backdropFilter: 'blur(16px)',
          }}
        >
          macOS &amp; Windows
        </div>
      </div>

      <div style={{ marginTop: 44, color: '#64748b', fontSize: 18, fontWeight: 500 }}>
        github.com/unitybtw/nova-browser
      </div>
    </div>
  );
};
