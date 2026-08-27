import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

export const Scene5Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const splitProgress = interpolate(frame, [15, 55], [0, 1], {
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
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.45)',
          color: '#60a5fa',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 16,
          boxShadow: '0 0 30px rgba(59, 130, 246, 0.3)',
        }}
      >
        <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 22, height: 22 }} />
        <span>Productivity & Workspaces</span>
      </div>

      <h2
        style={{
          fontSize: 66,
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 36px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Split View & Spatial Tabs
      </h2>

      {/* Browser Window Mockup with Split View */}
      <div
        style={{
          transform: `scale(${windowScale})`,
          width: 1140,
          height: 620,
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(35px)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 28,
          boxShadow: '0 35px 100px rgba(0, 0, 0, 0.8), 0 0 70px rgba(59, 130, 246, 0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Window Top Bar with Real Nova Tabs and Logo */}
        <div
          style={{
            height: 52,
            background: 'rgba(30, 41, 59, 0.85)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            gap: 16,
          }}
        >
          {/* Traffic Lights */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
          </div>

          {/* Active Split Tabs in TopBar */}
          <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'center' }}>
            <div
              style={{
                padding: '6px 18px',
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.4)',
                borderRadius: 10,
                color: '#38bdf8',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Img src={staticFile('nova-icon-transparent.png')} style={{ width: 16, height: 16 }} />
              <span>nova://newtab</span>
            </div>

            <div
              style={{
                padding: '6px 18px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: 10,
                color: '#e2e8f0',
                fontSize: 13,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span>github.com/unitybtw/nova-browser</span>
            </div>
          </div>

          {/* Workspaces Pill Badge */}
          <div
            style={{
              padding: '4px 14px',
              borderRadius: 8,
              background: 'rgba(168, 85, 247, 0.15)',
              border: '1px solid rgba(168, 85, 247, 0.4)',
              color: '#c084fc',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Workspace: Dev Engine
          </div>
        </div>

        {/* Split Panes Content Area */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255, 255, 255, 0.08)' }}>
          {/* Left Pane: Nova New Tab & Floating Clock Mockup */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              padding: 36,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
              }}
            />
            <div
              style={{
                fontSize: 72,
                fontWeight: 200,
                color: '#ffffff',
                letterSpacing: '0.04em',
                textShadow: '0 4px 24px rgba(0, 0, 0, 0.8)',
              }}
            >
              10:42
            </div>
            <div
              style={{
                marginTop: 8,
                padding: '4px 14px',
                borderRadius: 999,
                background: 'rgba(6, 182, 212, 0.15)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                color: '#22d3ee',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Wednesday, August 27
            </div>
            <div
              style={{
                marginTop: 24,
                width: 320,
                padding: '12px 20px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#94a3b8',
                fontSize: 14,
                textAlign: 'left',
              }}
            >
              Search web or ask @ai...
            </div>
          </div>

          {/* Right Pane: Live Docs / Code Pane */}
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.95)',
              padding: 32,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              opacity: splitProgress,
              transform: `translateX(${(1 - splitProgress) * 30}px)`,
            }}
          >
            <div style={{ color: '#38bdf8', fontSize: 16, fontWeight: 700 }}>
              Multi-View Spatial Workflow
            </div>
            <div style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              Browse documentation, watch video tutorials, or inspect code side-by-side with zero context switching and independent zoom controls.
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 12,
                padding: 16,
                border: '1px solid rgba(255, 255, 255, 0.06)',
                fontFamily: 'monospace',
                fontSize: 13,
                color: '#a5f3fc',
              }}
            >
              <div>// Split Screen Controller</div>
              <div style={{ color: '#4ade80' }}>await nova.splitView.attachTab(tab2);</div>
              <div style={{ color: '#94a3b8' }}>console.log("Memory isolation active");</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
