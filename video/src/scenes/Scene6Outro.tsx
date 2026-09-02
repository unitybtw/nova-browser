import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

export const Scene6Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110 },
  });

  const buttonGlow = interpolate(Math.sin(frame * 0.1), [-1, 1], [0.4, 0.8]);
  const ringRotate = (frame * 1.5) % 360;

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
      {/* 3D Nova Logo with Pulsing Rings */}
      <div
        style={{
          position: 'relative',
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 28,
          transform: `scale(${logoScale})`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            border: '2px dashed rgba(6, 182, 212, 0.6)',
            transform: `rotate(${ringRotate}deg)`,
            boxShadow: '0 0 35px rgba(6, 182, 212, 0.3)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.6) 0%, rgba(59, 130, 246, 0.25) 50%, transparent 80%)',
            filter: 'blur(25px)',
          }}
        />
        <Img
          src={staticFile('logo.svg')}
          alt="Nova Logo"
          style={{
            width: 140,
            height: 140,
            objectFit: 'contain',
            filter: 'drop-shadow(0 15px 35px rgba(6, 182, 212, 0.6))',
            zIndex: 2,
          }}
        />
      </div>

      <h2
        style={{
          fontSize: 78,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          margin: 0,
          background: 'linear-gradient(135deg, #ffffff 0%, #a5f3fc 45%, #38bdf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 10px 40px rgba(6, 182, 212, 0.4)',
        }}
      >
        Upgrade Your Browsing Today
      </h2>

      <p
        style={{
          fontSize: 30,
          color: '#94a3b8',
          maxWidth: 900,
          marginTop: 16,
          marginBottom: 38,
          fontWeight: 500,
        }}
      >
        Ultra-fast, 100% open-source, and engineered for privacy and local AI.
      </p>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <div
          style={{
            padding: '18px 48px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
            color: '#ffffff',
            fontSize: 24,
            fontWeight: 800,
            boxShadow: `0 12px 45px rgba(6, 182, 212, ${buttonGlow})`,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <Img src={staticFile('logo.svg')} style={{ width: 26, height: 26 }} />
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
            fontWeight: 700,
            backdropFilter: 'blur(20px)',
          }}
        >
          <span>github.com/unitybtw/nova-browser</span>
        </div>
      </div>

      {/* Platform Support Pills */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        {['macOS Apple Silicon & Intel', 'Windows 11 / 10', 'Linux 64-bit'].map((platform) => (
          <div
            key={platform}
            style={{
              padding: '6px 18px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#64748b',
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {platform}
          </div>
        ))}
      </div>
    </div>
  );
};
