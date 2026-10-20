import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, APPLE_MONO, AppleCaptionHeader, MacCursor } from '../components/RealNovaWindow';

export const Scene4Privacy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const shieldOpen = frame >= 28;
  const shieldSpring = spring({
    frame: Math.max(0, frame - 28),
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const syncOpen = frame >= 72;
  const syncSpring = spring({
    frame: Math.max(0, frame - 72),
    fps,
    config: { damping: 19, stiffness: 105 },
  });

  const syncVerified = frame >= 93;
  const verifyPulse = spring({
    frame: Math.max(0, frame - 93),
    fps,
    config: { damping: 15, stiffness: 140 },
  });

  const cameraScale = interpolate(frame, [0, 174], [1.0, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const blockedTrackers = Math.floor(
    interpolate(frame, [28, 95], [14, 38], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0c',
        fontFamily: APPLE_FONT,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 50% 0%, rgba(16, 185, 129, 0.12) 0%, rgba(10, 10, 12, 0.96) 65%, #0a0a0c 100%)',
        }}
      />

      <div style={{ position: 'relative', marginTop: 48, zIndex: 20 }}>
        <AppleCaptionHeader
          dark
          eyebrow="Privacy Shield & Encrypted Sync"
          headline="Protection built into every request."
          subline="Native tracker blocking and client-side AES-256-GCM encryption."
        />
      </div>

      {/* Real Nova Browser Window (Top-Anchored Transform Origin) */}
      <div
        style={{
          position: 'absolute',
          top: 236,
          width: 1360,
          height: 850,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 45px 120px rgba(0, 0, 0, 0.75)',
          overflow: 'hidden',
          transform: `scale(${cameraScale})`,
          transformOrigin: '62% 0%',
        }}
      >
        <Img
          src={staticFile('website-tour/newtab-clean-light.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
        />

        {shieldOpen && (
          <div
            style={{
              position: 'absolute',
              top: 86,
              right: 118,
              width: 360,
              borderRadius: 20,
              background: 'rgba(255, 255, 255, 0.98)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              boxShadow: '0 28px 70px rgba(15, 23, 42, 0.22)',
              padding: '20px 22px',
              opacity: shieldSpring,
              transform: `translateY(${(1 - shieldSpring) * -14}px) scale(${0.95 + 0.05 * shieldSpring})`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#10b981',
                    boxShadow: '0 0 10px rgba(16, 185, 129, 0.6)',
                  }}
                />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Nova Privacy Shield</span>
              </div>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#dcfce7',
                  padding: '3px 10px',
                  borderRadius: 999,
                }}
              >
                Active
              </span>
            </div>

            <div
              style={{
                padding: '14px 16px',
                borderRadius: 14,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 550 }}>Trackers & Ads Blocked</span>
              <span style={{ fontSize: 28, fontWeight: 750, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>
                {blockedTrackers}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12.5, color: '#334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Fingerprinting Defense</span>
                <span style={{ color: '#15803d', fontWeight: 650 }}>Strict</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Workspace Storage Partition</span>
                <span style={{ color: '#2563eb', fontWeight: 650 }}>Isolated</span>
              </div>
            </div>
          </div>
        )}

        {syncOpen && (
          <div
            style={{
              position: 'absolute',
              left: 340,
              top: 195,
              width: 520,
              borderRadius: 22,
              background: '#ffffff',
              border: '1px solid rgba(15, 23, 42, 0.12)',
              boxShadow: '0 34px 90px rgba(15, 23, 42, 0.25)',
              overflow: 'hidden',
              opacity: syncSpring,
              transform: `translateY(${(1 - syncSpring) * 28}px) scale(${0.95 + 0.05 * syncSpring})`,
            }}
          >
            <Img
              src={staticFile('website-tour/sync-clean-light.jpg')}
              style={{
                width: '100%',
                height: 'auto',
                display: 'block',
              }}
            />
            <div
              style={{
                padding: '14px 20px',
                background: syncVerified ? '#f0fdf4' : '#f8fafc',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontFamily: APPLE_MONO, fontSize: 11.5, fontWeight: 650, color: '#0f172a' }}>
                AES-256-GCM · PBKDF2 (600K)
              </span>
              <span
                style={{
                  padding: '4px 11px',
                  borderRadius: 999,
                  background: syncVerified ? '#16a34a' : '#e2e8f0',
                  color: syncVerified ? '#ffffff' : '#475569',
                  fontSize: 11.5,
                  fontWeight: 700,
                  transform: `scale(${syncVerified ? 0.96 + 0.04 * verifyPulse : 1})`,
                }}
              >
                {syncVerified ? 'Zero-Knowledge Verified' : 'Verify Key'}
              </span>
            </div>
          </div>
        )}

        <MacCursor
          keyframes={[
            { frame: 4, x: 980, y: 200 },
            { frame: 28, x: 1185, y: 65, click: true },
            { frame: 93, x: 785, y: 472, click: true },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
