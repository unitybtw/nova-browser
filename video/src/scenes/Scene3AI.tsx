import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene3AI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const chatScale = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const message1Opacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const message2Opacity = interpolate(frame, [45, 60], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const typedChars = Math.floor(
    interpolate(frame, [65, 120], [0, 140], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const fullAiResponse = "Nova Browser operates directly on your GPU using WebGPU. No data leaves your machine, ensuring 100% privacy with zero latency.";
  const aiText = fullAiResponse.slice(0, typedChars);

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
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.4)',
          color: '#c084fc',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: 20,
        }}
      >
        <span>Local AI Intelligence</span>
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
        Built-in WebGPU AI Assistant
      </h2>

      {/* SidePanel Chat Mockup Card */}
      <div
        style={{
          transform: `scale(${chatScale})`,
          width: 900,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(32px)',
          border: '1px solid rgba(168, 85, 247, 0.3)',
          borderRadius: 28,
          padding: 36,
          boxShadow: '0 30px 90px rgba(168, 85, 247, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {/* Chat Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 12px #10b981' }} />
            <span style={{ color: '#ffffff', fontWeight: 700, fontSize: 18 }}>Nova AI Copilot</span>
            <span style={{ background: 'rgba(168, 85, 247, 0.2)', color: '#d8b4fe', fontSize: 12, padding: '3px 10px', borderRadius: 9999, fontWeight: 600 }}>Llama-3-8B Local</span>
          </div>
          <span style={{ color: '#94a3b8', fontSize: 14 }}>WebGPU Accelerated (0ms Cloud Latency)</span>
        </div>

        {/* User Message */}
        <div
          style={{
            opacity: message1Opacity,
            alignSelf: 'flex-end',
            maxWidth: '80%',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            color: '#ffffff',
            padding: '16px 24px',
            borderRadius: '20px 20px 4px 20px',
            fontSize: 20,
            fontWeight: 500,
          }}
        >
          How does Nova ensure complete browsing privacy with AI?
        </div>

        {/* AI Response */}
        <div
          style={{
            opacity: message2Opacity,
            alignSelf: 'flex-start',
            maxWidth: '88%',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#f1f5f9',
            padding: '20px 26px',
            borderRadius: '20px 20px 20px 4px',
            fontSize: 20,
            lineHeight: 1.5,
          }}
        >
          {aiText}
          <span style={{ display: 'inline-block', width: 3, height: 20, background: '#a855f7', marginLeft: 6, verticalAlign: 'middle', animation: 'blink 1s infinite' }} />
        </div>

        {/* Feature Pills */}
        <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
            Offline Ready
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
            Zero API Keys Required
          </div>
          <div style={{ padding: '8px 16px', borderRadius: 12, background: 'rgba(255, 255, 255, 0.05)', color: '#cbd5e1', fontSize: 14, fontWeight: 600 }}>
            Instant Webpage Summarization
          </div>
        </div>
      </div>
    </div>
  );
};
