import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { APPLE_FONT, APPLE_MONO, AppleCaptionHeader, MacCursor, RealNovaTopChrome } from '../components/RealNovaWindow';

export const Scene5Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const splitActive = frame >= 26;
  const splitSpring = spring({
    frame: Math.max(0, frame - 26),
    fps,
    config: { damping: 19, stiffness: 92 },
  });

  const hibernateOpen = frame >= 108;
  const hibernateSpring = spring({
    frame: Math.max(0, frame - 108),
    fps,
    config: { damping: 18, stiffness: 120 },
  });

  const cameraZoom = interpolate(frame, [0, 192], [1.0, 1.09], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          background: 'radial-gradient(circle at 60% 10%, #ffffff 0%, #f4f6f9 68%, #e9edf3 100%)',
        }}
      />

      <div style={{ position: 'relative', marginTop: 48, zIndex: 20 }}>
        <AppleCaptionHeader
          eyebrow="Split View & Memory Guard"
          headline="Two pages side by side. Zero clutter."
          subline="Compare docs and code in one window while background tabs quietly hibernate."
        />
      </div>

      {/* Real Nova Browser Window (Top-Anchored Transform Origin) */}
      <div
        style={{
          position: 'absolute',
          top: 236,
          width: 1360,
          height: 800,
          borderRadius: 22,
          background: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 40px 110px rgba(15, 23, 42, 0.15), 0 12px 32px rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transform: `scale(${cameraZoom})`,
          transformOrigin: '55% 0%',
        }}
      >
        <RealNovaTopChrome
          activeTab={2}
          urlText="https://react.dev/reference/react/useMemo  |  https://github.com/unitybtw/nova-browser"
          splitActive={splitActive}
          shieldActive
        />

        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: splitActive ? `${100 - 48 * splitSpring}% ${48 * splitSpring}%` : '100% 0%',
            position: 'relative',
            background: '#f8fafc',
          }}
        >
          {/* Left Webview: React 19 Documentation */}
          <div
            style={{
              background: '#ffffff',
              borderRight: splitActive ? '1px solid #e2e8f0' : 'none',
              padding: '38px 46px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#2563eb', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                React 19 API Reference
              </span>
              <span style={{ fontSize: 12, color: '#64748b', fontFamily: APPLE_MONO }}>react.dev</span>
            </div>
            <h3 style={{ fontSize: 34, fontWeight: 700, color: '#0f172a', margin: 0, letterSpacing: '-0.03em' }}>
              useMemo(calculateValue, dependencies)
            </h3>
            <p style={{ fontSize: 16, lineHeight: 1.65, color: '#475569', margin: 0, maxWidth: 560 }}>
              Call <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 5, fontFamily: APPLE_MONO, fontSize: 14 }}>useMemo</code> at the top level of your component to cache a calculation between re-renders across split viewports.
            </p>

            <div
              style={{
                marginTop: 8,
                padding: '20px 24px',
                borderRadius: 16,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                fontFamily: APPLE_MONO,
                fontSize: 13.5,
                lineHeight: 1.75,
                color: '#1e293b',
              }}
            >
              <div style={{ color: '#64748b' }}>// Cached across Nova Split View resize</div>
              <div>
                <span style={{ color: '#2563eb' }}>const</span> visibleTabs = <span style={{ color: '#7c3aed' }}>useMemo</span>(
                () =&gt; filterActivePool(tabs), [tabs]);
              </div>
            </div>
          </div>

          {/* Right Webview: Nova Browser Repository Source */}
          {splitActive && (
            <div
              style={{
                background: '#fbfcfe',
                padding: '38px 42px',
                opacity: splitSpring,
                transform: `translateX(${(1 - splitSpring) * 40}px)`,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', letterSpacing: '0.06em' }}>
                  unitybtw / nova-browser
                </span>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 999,
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: 11.5,
                    fontWeight: 700,
                  }}
                >
                  Synced Scroll
                </span>
              </div>

              <div
                style={{
                  padding: '20px 22px',
                  borderRadius: 16,
                  background: '#0f172a',
                  color: '#f8fafc',
                  fontFamily: APPLE_MONO,
                  fontSize: 13,
                  lineHeight: 1.75,
                  boxShadow: '0 16px 36px rgba(15, 23, 42, 0.12)',
                }}
              >
                <div style={{ color: '#94a3b8' }}>// src/components/BrowserView.tsx</div>
                <div>
                  <span style={{ color: '#38bdf8' }}>export const</span> SplitViewport = () =&gt; {'{'}
                </div>
                <div style={{ paddingLeft: 18, color: '#a7f3d0' }}>
                  enforceLRUPool(6); // Max 6 live webviews
                </div>
                <div style={{ paddingLeft: 18, color: '#e2e8f0' }}>
                  suspendInactiveBackgroundTabs();
                </div>
                <div>{'}'};</div>
              </div>
            </div>
          )}

          {/* Smart Tab Hibernation Popover */}
          {hibernateOpen && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 28,
                width: 350,
                borderRadius: 18,
                background: 'rgba(255, 255, 255, 0.98)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
                padding: '18px 20px',
                opacity: hibernateSpring,
                transform: `translateY(${(1 - hibernateSpring) * -12}px) scale(${0.95 + 0.05 * hibernateSpring})`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>Smart Tab Hibernation</span>
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#15803d',
                    background: '#dcfce7',
                    padding: '3px 9px',
                    borderRadius: 999,
                  }}
                >
                  420 MB Freed
                </span>
              </div>
              {[
                { name: 'Spotify Web Player', state: 'Suspended · 0% CPU' },
                { name: 'Figma Design System', state: 'Suspended · Instant Restore' },
                { name: 'ArXiv Research PDF', state: 'Suspended · State Saved' },
              ].map((tab) => (
                <div
                  key={tab.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 0',
                    borderTop: '1px solid #f1f5f9',
                    fontSize: 12.5,
                  }}
                >
                  <span style={{ color: '#334155', fontWeight: 600 }}>{tab.name}</span>
                  <span style={{ color: '#64748b', fontSize: 11.5 }}>{tab.state}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <MacCursor
          keyframes={[
            { frame: 4, x: 860, y: 180 },
            { frame: 26, x: 1185, y: 65, click: true },
            { frame: 75, x: 960, y: 260 },
            { frame: 108, x: 1185, y: 110, click: true },
          ]}
        />
      </div>
    </AbsoluteFill>
  );
};
