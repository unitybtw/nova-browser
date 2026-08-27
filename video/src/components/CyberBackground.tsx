import React, { useMemo } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const CyberBackground: React.FC = () => {
  const frame = useCurrentFrame();

  const gridOffset = (frame * 2.2) % 70;
  const orb1X = interpolate(Math.sin(frame * 0.02), [-1, 1], [20, 80]);
  const orb1Y = interpolate(Math.cos(frame * 0.015), [-1, 1], [15, 75]);
  const orb2X = interpolate(Math.cos(frame * 0.022), [-1, 1], [80, 20]);
  const orb2Y = interpolate(Math.sin(frame * 0.018), [-1, 1], [75, 25]);
  const orb3X = interpolate(Math.sin(frame * 0.03 + 2), [-1, 1], [30, 70]);
  const orb3Y = interpolate(Math.cos(frame * 0.025 + 1), [-1, 1], [40, 60]);

  // Generate 40 deterministic animated stars
  const stars = useMemo(() => {
    return Array.from({ length: 45 }).map((_, i) => ({
      id: i,
      x: ((i * 37 + 13) % 100),
      y: ((i * 59 + 29) % 100),
      size: (i % 3) + 1.5,
      speed: (i % 4) * 0.4 + 0.6,
      opacity: (i % 5) * 0.15 + 0.35,
    }));
  }, []);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#020617',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      {/* Aurora Glow Orbs */}
      <div
        style={{
          position: 'absolute',
          top: `${orb1Y}%`,
          left: `${orb1X}%`,
          width: 900,
          height: 900,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(6, 182, 212, 0.35) 0%, rgba(59, 130, 246, 0.15) 45%, transparent 70%)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${orb2Y}%`,
          left: `${orb2X}%`,
          width: 850,
          height: 850,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(236, 72, 153, 0.12) 50%, transparent 75%)',
          filter: 'blur(110px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: `${orb3Y}%`,
          left: `${orb3X}%`,
          width: 700,
          height: 700,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.25) 0%, rgba(99, 102, 241, 0.1) 50%, transparent 75%)',
          filter: 'blur(90px)',
          pointerEvents: 'none',
        }}
      />

      {/* Floating Stardust Particles */}
      {stars.map((s) => {
        const starY = (s.y + frame * s.speed * 0.08) % 100;
        const twinkle = interpolate(
          Math.sin(frame * 0.08 + s.id),
          [-1, 1],
          [s.opacity * 0.4, s.opacity * 1.2]
        );
        return (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              top: `${starY}%`,
              left: `${s.x}%`,
              width: s.size,
              height: s.size,
              borderRadius: '50%',
              backgroundColor: s.id % 2 === 0 ? '#38bdf8' : '#e0e7ff',
              opacity: twinkle,
              boxShadow: `0 0 ${s.size * 3}px ${s.id % 2 === 0 ? '#38bdf8' : '#ffffff'}`,
              pointerEvents: 'none',
            }}
          />
        );
      })}

      {/* Cyber Grid with 3D Perspective Lines */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.045) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.045) 1px, transparent 1px)
          `,
          backgroundSize: '70px 70px',
          backgroundPosition: `0px ${gridOffset}px`,
          opacity: 0.85,
        }}
      />

      {/* Futuristic Lens Flare / Center Core Light */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100%',
          height: '2px',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.25) 0%, rgba(59, 130, 246, 0.1) 40%, transparent 80%)',
          filter: 'blur(4px)',
          pointerEvents: 'none',
        }}
      />

      {/* Vignette Rim Lighting */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 35%, rgba(2, 6, 23, 0.9) 100%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};
