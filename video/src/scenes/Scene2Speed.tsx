import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

export const Scene2Speed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const opsCount = Math.floor(
    interpolate(frame, [10, 80], [0, 1248050], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const speedProgress = interpolate(frame, [15, 80], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const latencyProgress = interpolate(frame, [20, 75], [0, 1], {
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
        zIndex: 10,
        padding: '0 80px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Category Pill with Nova Icon */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 24px',
          borderRadius: 9999,
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.45)',
          color: '#facc15',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 16,
          boxShadow: '0 0 30px rgba(234, 179, 8, 0.25)',
        }}
      >
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 22, height: 22 }} />
        <span>Performance Telemetry</span>
      </div>

      <h2
        style={{
          fontSize: 66,
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 36px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #fef08a 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Blazing Fast V8 Architecture
      </h2>

      {/* Main Benchmark Grid Card */}
      <div
        style={{
          transform: `scale(${cardScale})`,
          width: 1240,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(35px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: 32,
          padding: '44px 54px',
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: 40,
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.7), 0 0 60px rgba(6, 182, 212, 0.15)',
        }}
      >
        {/* Metric 1: Throughput */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            borderRadius: 24,
            padding: '32px 36px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tab Indexing & Allocation Throughput
            </div>
            <div
              style={{
                fontSize: 64,
                fontWeight: 900,
                color: '#38bdf8',
                margin: '12px 0 6px 0',
                fontVariantNumeric: 'tabular-nums',
                textShadow: '0 0 35px rgba(56, 189, 248, 0.5)',
              }}
            >
              {opsCount.toLocaleString()}
              <span style={{ fontSize: 24, fontWeight: 600, color: '#94a3b8', marginLeft: 10 }}>ops/sec</span>
            </div>
            <div style={{ color: '#64748b', fontSize: 15 }}>
              Zero-allocation React.memo reconciliation & instant tab lifecycle
            </div>
          </div>

          {/* Animated Gauge Bar */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 14, marginBottom: 8, fontWeight: 600 }}>
              <span>Nova Speed Index</span>
              <span style={{ color: '#38bdf8' }}>{Math.round(speedProgress)}% Max Pipeline</span>
            </div>
            <div style={{ width: '100%', height: 12, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${speedProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #06b6d4 0%, #38bdf8 50%, #818cf8 100%)',
                  boxShadow: '0 0 20px #38bdf8',
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        </div>

        {/* Metric 2: Switch Latency Comparison */}
        <div
          style={{
            background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)',
            borderRadius: 24,
            padding: '32px 36px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ color: '#94a3b8', fontSize: 16, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Tab Switch Latency
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '12px 0 6px 0' }}>
              <span
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: '#4ade80',
                  textShadow: '0 0 35px rgba(74, 222, 128, 0.5)',
                }}
              >
                0.08 ms
              </span>
              <span style={{ fontSize: 20, color: '#94a3b8', fontWeight: 600 }}>Nova Browser</span>
            </div>
            <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700, margin: '6px 0' }}>
              vs 28.4 ms{' '}
              <span style={{ color: '#64748b', fontSize: 14, fontWeight: 500 }}>(Chrome / Chromium Default)</span>
            </div>
          </div>

          {/* Comparison Progress Bars */}
          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4ade80', fontWeight: 600, marginBottom: 4 }}>
                <span>Nova (Instant Switch)</span>
                <span>0.08 ms</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999 }}>
                <div style={{ width: `${96 * latencyProgress}%`, height: '100%', background: '#4ade80', borderRadius: 999, boxShadow: '0 0 12px #4ade80' }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>
                <span>Standard Browsers</span>
                <span>28.4 ms (350x slower)</span>
              </div>
              <div style={{ width: '100%', height: 8, background: 'rgba(255, 255, 255, 0.08)', borderRadius: 999 }}>
                <div style={{ width: `${14 * latencyProgress}%`, height: '100%', background: '#ef4444', borderRadius: 999 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
