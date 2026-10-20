import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, APPLE_MONO, AppleCaptionHeader, MacCursor } from '../components/RealNovaWindow';

export const Scene3AI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const zoomToSidebar = spring({
    frame: Math.max(0, frame - 24),
    fps,
    config: { damping: 20, stiffness: 75, mass: 1.05 },
  });

  // Top-anchored transformOrigin so scaling never overlaps the headline above
  const cameraScale = interpolate(zoomToSidebar, [0, 1], [1.0, 1.24]);
  const cameraOriginX = interpolate(zoomToSidebar, [0, 1], [50, 86]);

  const promptText = 'Summarize this page locally with WebGPU';
  const typedPrompt = promptText.slice(
    0,
    Math.floor(interpolate(frame, [34, 59], [0, promptText.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
  );

  const sent = frame >= 62;
  const responseSpring = spring({
    frame: Math.max(0, frame - 66),
    fps,
    config: { damping: 18, stiffness: 110 },
  });

  const aiSummary =
    'Executed on-device via WebGPU (Llama 3.2 3B):\n• Zero browsing context leaves your Mac.\n• Virtualized tab pool keeps memory low.\n• End-to-end encrypted vault sync.';
  const streamedSummary = aiSummary.slice(
    0,
    Math.floor(interpolate(frame, [70, 165], [0, aiSummary.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
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
          background: 'radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.14) 0%, rgba(10, 10, 12, 0.96) 62%, #0a0a0c 100%)',
        }}
      />

      <div style={{ position: 'relative', marginTop: 48, zIndex: 20 }}>
        <AppleCaptionHeader
          dark
          eyebrow="Local Intelligence · WebGPU"
          headline="Help right where you are. Private by design."
          subline="Supported models run locally on your hardware with zero cloud latency."
        />
      </div>

      {/* Real Nova Browser Window (Top-Anchored Transform Origin so header is never overlapped) */}
      <div
        style={{
          position: 'absolute',
          top: 236,
          width: 1360,
          height: 850,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.16)',
          boxShadow: '0 45px 120px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          overflow: 'hidden',
          transform: `scale(${cameraScale})`,
          transformOrigin: `${cameraOriginX}% 0%`,
        }}
      >
        <Img
          src={staticFile('website-tour/assistant-clean-light.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            display: 'block',
          }}
        />

        {sent && (
          <div
            style={{
              position: 'absolute',
              left: 978,
              top: 142,
              width: 364,
              height: 590,
              background: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              padding: '16px 14px',
              opacity: responseSpring,
            }}
          >
            <div
              style={{
                alignSelf: 'flex-end',
                maxWidth: '88%',
                padding: '11px 15px',
                borderRadius: '16px 16px 4px 16px',
                background: '#2563eb',
                color: '#ffffff',
                fontSize: 13,
                fontWeight: 550,
                lineHeight: 1.45,
                boxShadow: '0 6px 18px rgba(37, 99, 235, 0.18)',
              }}
            >
              {promptText}
            </div>

            <div
              style={{
                alignSelf: 'flex-start',
                width: '100%',
                padding: '15px 16px',
                borderRadius: '16px 16px 16px 4px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                color: '#1e293b',
                fontSize: 13,
                lineHeight: 1.65,
                whiteSpace: 'pre-line',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2563eb' }}>Nova Assistant</span>
                <span
                  style={{
                    fontFamily: APPLE_MONO,
                    fontSize: 10,
                    fontWeight: 600,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '2px 7px',
                    borderRadius: 999,
                  }}
                >
                  On-Device WebGPU
                </span>
              </div>
              <span>{streamedSummary}</span>
              <span
                style={{
                  display: 'inline-block',
                  width: 2,
                  height: 14,
                  marginLeft: 3,
                  verticalAlign: 'middle',
                  background: '#2563eb',
                  opacity: frame % 12 < 6 ? 1 : 0,
                }}
              />
            </div>
          </div>
        )}

        {frame >= 30 && (
          <div
            style={{
              position: 'absolute',
              left: 978,
              top: 786,
              width: 364,
              height: 48,
              borderRadius: 999,
              background: '#ffffff',
              border: '1.5px solid rgba(37, 99, 235, 0.5)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              justifyContent: 'space-between',
              boxShadow: '0 6px 20px rgba(37, 99, 235, 0.1)',
            }}
          >
            <span style={{ fontSize: 12.5, color: sent ? '#94a3b8' : '#0f172a', fontWeight: 500 }}>
              {sent ? 'Ask Nova Assistant anything...' : typedPrompt}
            </span>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#0f172a',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              ↑
            </span>
          </div>
        )}

        <MacCursor
          keyframes={[
            { frame: 5, x: 920, y: 180 },
            { frame: 27, x: 1148, y: 64, click: true },
            { frame: 36, x: 1120, y: 810 },
            { frame: 62, x: 1324, y: 810, click: true },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
