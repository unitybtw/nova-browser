import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

export const Scene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 110, mass: 0.8 },
  });

  const floatY = Math.sin(frame * 0.05) * 8;
  const ringRotate = (frame * 1.2) % 360;
  const ringRotateReverse = 360 - ((frame * 0.9) % 360);

  const titleOpacity = interpolate(frame, [15, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(frame, [15, 38], [40, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subtitleOpacity = interpolate(frame, [35, 58], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeOpacity = interpolate(frame, [50, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowPulse = interpolate(Math.sin(frame * 0.08), [-1, 1], [0.65, 1]);

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
      {/* Top Futuristic Tag Pill */}
      <div
        style={{
          opacity: badgeOpacity,
          transform: 'translateY(-15px)',
          padding: '10px 28px',
          borderRadius: '9999px',
          background: 'rgba(6, 182, 212, 0.12)',
          border: '1px solid rgba(6, 182, 212, 0.5)',
          backdropFilter: 'blur(20px)',
          color: '#38bdf8',
          fontSize: 19,
          fontWeight: 700,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          marginBottom: 36,
          boxShadow: '0 0 35px rgba(6, 182, 212, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#22d3ee',
            boxShadow: '0 0 12px #22d3ee',
          }}
        />
        Next-Generation Web Browser
      </div>

      {/* Hero 3D Logo Container with Holographic Energy Rings & Glass Plate */}
      <div
        style={{
          position: 'relative',
          width: 250,
          height: 250,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 34,
          transform: `scale(${logoScale}) translateY(${floatY}px)`,
        }}
      >
        {/* Outer Rotating Cyan Energy Ring */}
        <div
          style={{
            position: 'absolute',
            inset: -18,
            borderRadius: '50%',
            border: '2px dashed rgba(6, 182, 212, 0.65)',
            transform: `rotate(${ringRotate}deg)`,
            boxShadow: '0 0 45px rgba(6, 182, 212, 0.3)',
          }}
        />

        {/* Inner Counter-Rotating Violet Energy Ring */}
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '1.5px solid rgba(168, 85, 247, 0.5)',
            borderTopColor: 'transparent',
            borderBottomColor: 'transparent',
            transform: `rotate(${ringRotateReverse}deg)`,
          }}
        />

        {/* Frosted Glass Emblem Plate */}
        <div
          style={{
            position: 'absolute',
            inset: 12,
            borderRadius: 48,
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 100%)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.4)',
          }}
        />

        {/* Center Glowing Neon Halo */}
        <div
          style={{
            position: 'absolute',
            inset: 20,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(6, 182, 212, 0.7) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 80%)',
            filter: 'blur(35px)',
            opacity: glowPulse,
          }}
        />

        {/* Real Official Nova Logo Image */}
        <Img
          src={staticFile('nova-icon-transparent.png')}
          alt="Nova Logo"
          style={{
            width: 160,
            height: 160,
            objectFit: 'contain',
            filter: 'drop-shadow(0 15px 30px rgba(6, 182, 212, 0.7))',
            zIndex: 2,
          }}
        />
      </div>

      {/* Main Brand Title */}
      <h1
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          fontSize: 94,
          fontWeight: 900,
          letterSpacing: '-0.03em',
          margin: 0,
          background: 'linear-gradient(135deg, #ffffff 0%, #a5f3fc 45%, #38bdf8 80%, #818cf8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 10px 40px rgba(6, 182, 212, 0.4)',
        }}
      >
        NOVA BROWSER
      </h1>

      {/* Subtitle & Value Proposition */}
      <p
        style={{
          opacity: subtitleOpacity,
          fontSize: 32,
          fontWeight: 500,
          color: '#94a3b8',
          maxWidth: 960,
          margin: '22px 0 0 0',
          lineHeight: 1.4,
          letterSpacing: '-0.01em',
        }}
      >
        Engineered for <span style={{ color: '#38bdf8', fontWeight: 700 }}>Pure Speed</span>,{' '}
        <span style={{ color: '#c084fc', fontWeight: 700 }}>Local WebGPU AI</span> &{' '}
        <span style={{ color: '#34d399', fontWeight: 700 }}>Zero-Telemetry Privacy</span>
      </p>
    </div>
  );
};
