import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene4Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldScale = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 120 },
  });

  const blockedCount = Math.floor(
    interpolate(frame, [10, 70], [0, 48290], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const trackerFilterThroughput = Math.floor(
    interpolate(frame, [15, 80], [0, 1742158], {
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
          gap: 10,
          padding: '8px 22px',
          borderRadius: 9999,
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          color: '#34d399',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        <span>Zero-Knowledge Architecture</span>
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
        Uncompromising Privacy Shield
      </h2>

      {/* 3-Column Shield Matrix */}
      <div
        style={{
          transform: `scale(${shieldScale})`,
          width: 1200,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 32,
        }}
      >
        {/* Card 1 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 24,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Active AdBlock</h3>
            <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.5, margin: 0 }}>
              Built-in network layer rule engine blocks popups, video ads and malicious payloads before download.
            </p>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ color: '#10b981', fontSize: 32, fontWeight: 800 }}>{blockedCount.toLocaleString()}</span>
            <span style={{ color: '#64748b', fontSize: 14, display: 'block' }}>Trackers Blocked Today</span>
          </div>
        </div>

        {/* Card 2 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(6, 182, 212, 0.3)',
            borderRadius: 24,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(6, 182, 212, 0.15)', border: '1px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>E2EE Device Sync</h3>
            <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.5, margin: 0 }}>
              PBKDF2-SHA256 &amp; AES-GCM-256 decentralized pairing chains. Zero telemetry, zero stored passwords.
            </p>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ color: '#06b6d4', fontSize: 32, fontWeight: 800 }}>AES-256</span>
            <span style={{ color: '#64748b', fontSize: 14, display: 'block' }}>Zero-Knowledge Vault</span>
          </div>
        </div>

        {/* Card 3 */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(30px)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: 24,
            padding: 36,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(168, 85, 247, 0.15)', border: '1px solid #a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </div>
            <h3 style={{ fontSize: 24, fontWeight: 700, color: '#ffffff', margin: '0 0 8px 0' }}>Security Filter Engine</h3>
            <p style={{ color: '#94a3b8', fontSize: 16, lineHeight: 1.5, margin: 0 }}>
              Evaluates incoming domains against 100k+ malicious signatures in 0.58 microseconds per request.
            </p>
          </div>
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ color: '#a855f7', fontSize: 32, fontWeight: 800 }}>{trackerFilterThroughput.toLocaleString()}</span>
            <span style={{ color: '#64748b', fontSize: 14, display: 'block' }}>Rule Evaluations / Sec</span>
          </div>
        </div>
      </div>
    </div>
  );
};
