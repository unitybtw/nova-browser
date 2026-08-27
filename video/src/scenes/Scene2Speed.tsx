import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene2Speed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardScale = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const opsCount = Math.floor(
    interpolate(frame, [10, 80], [0, 1160537], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const speedProgress = interpolate(frame, [15, 80], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const latencyProgress = interpolate(frame, [25, 75], [0, 1], {
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
      {/* Category Pill */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 22px',
          borderRadius: 9999,
          background: 'rgba(234, 179, 8, 0.12)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          color: '#facc15',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        <span>Performance Benchmark</span>
      </div>

      <h2
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 40px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Blazing Fast Architecture
      </h2>

      {/* Main Benchmark Grid Card */}
      <div
        style={{
          transform: `scale(${cardScale})`,
          width: 1200,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 32,
          padding: '48px 56px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 48,
          boxShadow: '0 30px 80px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Metric 1: Throughput */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 24,
            padding: '36px 32px',
            border: '1px solid rgba(6, 182, 212, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ color: '#06b6d4', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Tab Allocation Engine
            </span>
            <div style={{ fontSize: 62, fontWeight: 800, color: '#ffffff', marginTop: 12, fontVariantNumeric: 'tabular-nums' }}>
              {opsCount.toLocaleString()}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 18, marginTop: 4 }}>Operations / Second</div>
          </div>

          <div style={{ marginTop: 28 }}>
            <div style={{ height: 10, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${speedProgress}%`,
                  background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                  borderRadius: 9999,
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#64748b', fontSize: 14 }}>
              <span>Instant Lifecycle</span>
              <span style={{ color: '#22d3ee', fontWeight: 600 }}>0.09ms Creation Latency</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Latency Comparison */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            borderRadius: 24,
            padding: '36px 32px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ color: '#10b981', fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Tab Switch Latency
            </span>
            <div style={{ fontSize: 62, fontWeight: 800, color: '#10b981', marginTop: 12 }}>
              0.09 ms
            </div>
            <div style={{ color: '#94a3b8', fontSize: 18, marginTop: 4 }}>Near-Zero Memory Hibernation</div>
          </div>

          {/* Comparative bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 24 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#e2e8f0', fontSize: 14, marginBottom: 6 }}>
                <span style={{ fontWeight: 700, color: '#22d3ee' }}>Nova Browser</span>
                <span style={{ color: '#10b981', fontWeight: 700 }}>0.09 ms</span>
              </div>
              <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.1)' }}>
                <div style={{ height: '100%', width: `${latencyProgress * 100}%`, background: '#06b6d4', borderRadius: 9999 }} />
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 14, marginBottom: 6 }}>
                <span>Legacy Chrome / Edge</span>
                <span>28.4 ms</span>
              </div>
              <div style={{ height: 8, borderRadius: 9999, background: 'rgba(255, 255, 255, 0.1)' }}>
                <div style={{ height: '100%', width: '15%', background: '#64748b', borderRadius: 9999 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
