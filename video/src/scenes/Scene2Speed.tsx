import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, APPLE_MONO, AppleCaptionHeader, MacCursor } from '../components/RealNovaWindow';

export const Scene2Speed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panToCenter = spring({
    frame: Math.max(0, frame - 66),
    fps,
    config: { damping: 20, stiffness: 75, mass: 1.0 },
  });

  // Top-anchored macro zoom so the browser window never overlaps the headline
  const cameraScale = interpolate(panToCenter, [0, 1], [1.26, 1.08]);
  const cameraOriginX = interpolate(panToCenter, [0, 1], [12, 50]);

  const tabClicked = frame >= 38;
  const tabHighlight = spring({
    frame: Math.max(0, frame - 38),
    fps,
    config: { damping: 16, stiffness: 140 },
  });

  const spotlightOpen = frame >= 75;
  const spotlightSpring = spring({
    frame: Math.max(0, frame - 75),
    fps,
    config: { damping: 17, stiffness: 130 },
  });

  const commandExecuted = frame >= 152;
  const execPulse = spring({
    frame: Math.max(0, frame - 152),
    fps,
    config: { damping: 14, stiffness: 160 },
  });

  const commandQuery = 'open split view: react 19 docs';
  const typedCount = Math.floor(
    interpolate(frame, [82, 144], [0, commandQuery.length], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#f5f5f7',
        fontFamily: APPLE_FONT,
        overflow: 'hidden',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 30% 10%, #ffffff 0%, #f3f5f8 65%, #e8ecf2 100%)',
        }}
      />

      <div style={{ position: 'relative', marginTop: 48, zIndex: 20 }}>
        <AppleCaptionHeader
          eyebrow="Workspaces & Command Bar"
          headline="Every project in its own clean space."
          subline="Vertical tabs, isolated sessions, and instant keyboard navigation."
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
          border: '1px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 40px 110px rgba(15, 23, 42, 0.15), 0 12px 32px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          transform: `scale(${cameraScale})`,
          transformOrigin: `${cameraOriginX}% 0%`,
        }}
      >
        <Img
          src={staticFile('website-tour/workspaces-clean-light.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top left',
            display: 'block',
          }}
        />

        {/* Exact-aligned Active Pill over 'React 19 Docs' in Vertical Sidebar */}
        {tabClicked && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              top: 247,
              width: 212,
              height: 28,
              borderRadius: 8,
              background: '#eff6ff',
              border: '1.5px solid rgba(37, 99, 235, 0.5)',
              display: 'flex',
              alignItems: 'center',
              padding: '0 12px',
              gap: 9,
              opacity: tabHighlight,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb' }} />
            <span style={{ fontSize: 12, fontWeight: 650, color: '#1e3a8a' }}>React 19 Docs</span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 9.5,
                fontWeight: 700,
                color: '#2563eb',
                background: '#ffffff',
                padding: '1px 6px',
                borderRadius: 5,
              }}
            >
              Active
            </span>
          </div>
        )}

        {/* Crisp Cmd+K Instant Command Palette Overlay */}
        {spotlightOpen && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `rgba(15, 23, 42, ${0.1 * spotlightSpring})`,
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'center',
              paddingTop: 145,
            }}
          >
            <div
              style={{
                width: 680,
                borderRadius: 20,
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(15, 23, 42, 0.14)',
                boxShadow: '0 32px 90px rgba(15, 23, 42, 0.22)',
                overflow: 'hidden',
                opacity: spotlightSpring,
                transform: `scale(${0.94 + 0.06 * spotlightSpring}) translateY(${(1 - spotlightSpring) * 18}px)`,
              }}
            >
              <div
                style={{
                  padding: '18px 22px',
                  borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <Img src={staticFile('website-tour/nova-icon.svg')} style={{ width: 22, height: 22 }} />
                <div style={{ fontSize: 17, fontWeight: 550, color: '#1d1d1f', flex: 1 }}>
                  <span>{commandQuery.slice(0, typedCount)}</span>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 19,
                      marginLeft: 2,
                      verticalAlign: 'middle',
                      background: '#2563eb',
                      opacity: frame % 12 < 6 ? 1 : 0,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: APPLE_MONO,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: '#64748b',
                    padding: '4px 9px',
                    borderRadius: 7,
                    background: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  Cmd + K
                </span>
              </div>

              <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  {
                    title: 'Open in Split View: React 19 Docs + Nova GitHub',
                    tag: 'Split View',
                    shortcut: 'Return',
                    active: true,
                  },
                  {
                    title: 'Move Tab to Workspace: Frontend Stack',
                    tag: 'Workspace',
                    shortcut: 'Cmd + M',
                    active: false,
                  },
                  {
                    title: 'Ask Nova Local AI to Summarize Tab',
                    tag: 'Nova AI',
                    shortcut: 'Cmd + J',
                    active: false,
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: item.active
                        ? commandExecuted
                          ? '#dbeafe'
                          : '#eff6ff'
                        : 'transparent',
                      border: item.active ? '1px solid rgba(37, 99, 235, 0.3)' : '1px solid transparent',
                      transform: item.active && commandExecuted ? `scale(${1 - 0.015 * execPulse})` : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: item.active ? '#2563eb' : '#94a3b8',
                        }}
                      />
                      <span style={{ fontSize: 14.5, fontWeight: item.active ? 650 : 500, color: '#1e293b' }}>
                        {item.title}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 600,
                          color: item.active ? '#2563eb' : '#64748b',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: item.active ? '#ffffff' : '#f8fafc',
                        }}
                      >
                        {item.tag}
                      </span>
                      <span
                        style={{
                          fontFamily: APPLE_MONO,
                          fontSize: 11,
                          color: '#64748b',
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: '#f1f5f9',
                        }}
                      >
                        {item.shortcut}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <MacCursor
          keyframes={[
            { frame: 5, x: 240, y: 340 },
            { frame: 38, x: 105, y: 284, click: true },
            { frame: 75, x: 520, y: 185, click: true },
            { frame: 152, x: 590, y: 246, click: true },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
