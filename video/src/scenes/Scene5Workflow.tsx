import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene5Workflow: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const windowScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });

  const splitProgress = interpolate(frame, [20, 60], [0, 1], {
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
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          color: '#60a5fa',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        <span>Spatial Multitasking</span>
      </div>

      <h2
        style={{
          fontSize: 64,
          fontWeight: 800,
          color: '#ffffff',
          margin: '0 0 36px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        Split View &amp; Workspaces
      </h2>

      {/* Browser Window Mockup with Split View */}
      <div
        style={{
          transform: `scale(${windowScale})`,
          width: 1100,
          height: 600,
          background: 'rgba(15, 23, 42, 0.9)',
          backdropFilter: 'blur(30px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: 24,
          boxShadow: '0 30px 100px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Window Top Bar */}
        <div style={{ height: 48, background: 'rgba(30, 41, 59, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ padding: '6px 16px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: 8, color: '#ffffff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>github.com/nova</span>
            </div>
            <div style={{ padding: '6px 16px', background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 8, color: '#22d3ee', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>Split Active</span>
            </div>
          </div>
        </div>

        {/* Split View Content Area */}
        <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
          {/* Left Pane */}
          <div style={{ flex: 1, background: '#090d16', borderRight: '2px solid rgba(6, 182, 212, 0.4)', padding: 28, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 14 }}>
              <span style={{ color: '#22d3ee', fontWeight: 700 }}>Primary Window:</span> Research &amp; Code
            </div>
            <div style={{ height: 20, width: '60%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 6 }} />
            <div style={{ height: 14, width: '90%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 4 }} />
            <div style={{ height: 14, width: '80%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 4 }} />
            <div style={{ height: 160, width: '100%', background: 'rgba(6, 182, 212, 0.05)', border: '1px dashed rgba(6, 182, 212, 0.3)', borderRadius: 12, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8', fontSize: 16, fontWeight: 600 }}>
              Live Interactive Workspace
            </div>
          </div>

          {/* Right Pane (Animated Slide In) */}
          <div
            style={{
              flex: splitProgress,
              opacity: splitProgress,
              background: '#0d1527',
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              overflow: 'hidden',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#94a3b8', fontSize: 14 }}>
              <span style={{ color: '#a855f7', fontWeight: 700 }}>Secondary Window:</span> Live Documentation
            </div>
            <div style={{ height: 20, width: '70%', background: 'rgba(255, 255, 255, 0.08)', borderRadius: 6 }} />
            <div style={{ height: 14, width: '95%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 4 }} />
            <div style={{ height: 14, width: '85%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 4 }} />
            <div style={{ height: 160, width: '100%', background: 'rgba(168, 85, 247, 0.05)', border: '1px dashed rgba(168, 85, 247, 0.3)', borderRadius: 12, marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc', fontSize: 16, fontWeight: 600 }}>
              Zero Tab Clutter Multitasking
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
