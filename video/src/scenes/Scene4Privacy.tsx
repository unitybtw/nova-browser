import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

export const Scene4Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const blockedCount = Math.floor(
    interpolate(frame, [10, 75], [0, 48290], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const trackerFilterThroughput = Math.floor(
    interpolate(frame, [15, 80], [0, 2016661], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        padding: '0 80px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Category Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 24px',
          borderRadius: 9999,
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.45)',
          color: '#34d399',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 16,
          boxShadow: '0 0 30px rgba(16, 185, 129, 0.3)',
        }}
      >
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 22, height: 22 }} />
        <span>Zero-Knowledge Privacy</span>
      </div>

      <h2
        style={{
          fontSize: 66,
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 36px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Uncompromising Defense & Cryptography
      </h2>

      {/* 3-Column Shield Matrix */}
      <div
        style={{
          transform: `scale(${shieldScale})`,
          width: 1240,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 28,
        }}
      >
        {/* Card 1: AdBlock Engine */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(35px)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: 26,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(16, 185, 129, 0.15)',
          }}
        >
          <div>
            <div style={{ color: '#34d399', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Native AdBlock Engine
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: '#ffffff',
                margin: '12px 0 6px 0',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {blockedCount.toLocaleString()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.4 }}>
              Trackers, telemetry & cryptominers blocked in real-time
            </div>
          </div>
          <div style={{ marginTop: 24, padding: '10px 14px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34d399', fontSize: 13, fontWeight: 600 }}>
            0.48 µs / rule check latency
          </div>
        </div>

        {/* Card 2: Interception Throughput */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(35px)',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: 26,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(56, 189, 248, 0.15)',
          }}
        >
          <div>
            <div style={{ color: '#38bdf8', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Filter Throughput
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: '#ffffff',
                margin: '12px 0 6px 0',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {trackerFilterThroughput.toLocaleString()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.4 }}>
              Rule classifications per second across all active webviews
            </div>
          </div>
          <div style={{ marginTop: 24, padding: '10px 14px', background: 'rgba(56, 189, 248, 0.1)', borderRadius: 12, border: '1px solid rgba(56, 189, 248, 0.25)', color: '#38bdf8', fontSize: 13, fontWeight: 600 }}>
            Zero main-thread blocking
          </div>
        </div>

        {/* Card 3: E2EE Sync Chain */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(35px)',
            border: '1px solid rgba(168, 85, 247, 0.35)',
            borderRadius: 26,
            padding: '32px 28px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(168, 85, 247, 0.15)',
          }}
        >
          <div>
            <div style={{ color: '#c084fc', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AES-GCM-256 Sync Chain
            </div>
            <div
              style={{
                fontSize: 40,
                fontWeight: 900,
                color: '#ffffff',
                margin: '12px 0 6px 0',
              }}
            >
              End-to-End
            </div>
            <div style={{ color: '#94a3b8', fontSize: 15, lineHeight: 1.4 }}>
              Device-to-device encrypted bookmarks, history & workspace sync
            </div>
          </div>
          <div style={{ marginTop: 24, padding: '10px 14px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 12, border: '1px solid rgba(168, 85, 247, 0.25)', color: '#c084fc', fontSize: 13, fontWeight: 600 }}>
            No plain-text storage on servers
          </div>
        </div>
      </div>
    </div>
  );
};
