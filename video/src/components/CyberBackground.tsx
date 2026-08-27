import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const CyberBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const gridOffset = (frame * 1.5) % 60;
  const orb1X = interpolate(Math.sin(frame * 0.02), [-1, 1], [15, 85]);
  const orb1Y = interpolate(Math.cos(frame * 0.015), [-1, 1], [20, 80]);
  const orb2X = interpolate(Math.cos(frame * 0.025), [-1, 1], [80, 20]);
  const orb2Y = interpolate(Math.sin(frame * 0.02), [-1, 1], [70, 30]);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#030712',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Dynamic Glowing Aurora Orbs */}
      <div
        style={{
          position: 'absolute',
          top: `${orb1Y}%`,
          left: `${orb1X}%`,
          width: 800,
          height: 800,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(59, 130, 246, 0.12) 45%, transparent 70%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${orb2Y}%`,
          left: `${orb2X}%`,
          width: 750,
          height: 750,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.22) 0%, rgba(236, 72, 153, 0.1) 50%, transparent 75%)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />

      {/* Cyber Grid Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          backgroundPosition: `0px ${gridOffset}px`,
          opacity: 0.8,
        }}
      />

      {/* Top and Bottom Vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(3, 7, 18, 0.85) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
