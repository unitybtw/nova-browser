import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig, staticFile, Img } from 'remotion';

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

  const message2Opacity = interpolate(frame, [38, 52], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const typedChars = Math.floor(
    interpolate(frame, [55, 125], [0, 145], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  const fullAiResponse = "Nova AI runs locally on your GPU via WebGPU. All your queries stay 100% on your device, with zero cloud latency and no API keys required.";
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
      {/* Category Pill with Nova Icon */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 24px',
          borderRadius: 9999,
          background: 'rgba(168, 85, 247, 0.15)',
          border: '1px solid rgba(168, 85, 247, 0.45)',
          color: '#c084fc',
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 16,
          boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
        }}
      >
        <Img src={staticFile('logo.svg')} style={{ width: 22, height: 22 }} />
        <span>Local AI Intelligence</span>
      </div>

      <h2
        style={{
          fontSize: 66,
          fontWeight: 900,
          color: '#ffffff',
          margin: '0 0 36px 0',
          letterSpacing: '-0.02em',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #ffffff 0%, #e9d5ff 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        On-Device WebGPU AI Copilot
      </h2>

      {/* SidePanel Chat Mockup Card */}
      <div
        style={{
          transform: `scale(${chatScale})`,
          width: 960,
          background: 'rgba(15, 23, 42, 0.88)',
          backdropFilter: 'blur(35px)',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          borderRadius: 30,
          padding: '36px 42px',
          boxShadow: '0 30px 90px rgba(0, 0, 0, 0.7), 0 0 60px rgba(168, 85, 247, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {/* Chat Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
              }}
            >
              <Img src={staticFile('logo.svg')} style={{ width: 30, height: 30 }} />
            </div>
            <div>
              <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 20 }}>Nova AI Copilot</div>
              <div style={{ color: '#a855f7', fontSize: 14, fontWeight: 600 }}>Llama 3.2 · WebGPU Hardware Accelerated</div>
            </div>
          </div>
          <div
            style={{
              padding: '6px 16px',
              borderRadius: 9999,
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              color: '#4ade80',
              fontSize: 13,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
            100% Offline & Private
          </div>
        </div>

        {/* Message 1: User Query */}
        <div
          style={{
            opacity: message1Opacity,
            alignSelf: 'flex-end',
            background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
            color: '#ffffff',
            padding: '16px 24px',
            borderRadius: '20px 20px 4px 20px',
            fontSize: 18,
            fontWeight: 500,
            maxWidth: '80%',
            boxShadow: '0 8px 25px rgba(37, 99, 235, 0.35)',
          }}
        >
          Can you summarize this tab without sending my data to any cloud servers?
        </div>

        {/* Message 2: Nova AI Streaming Response */}
        <div
          style={{
            opacity: message2Opacity,
            alignSelf: 'flex-start',
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#e2e8f0',
            padding: '18px 26px',
            borderRadius: '20px 20px 20px 4px',
            fontSize: 18,
            lineHeight: 1.55,
            maxWidth: '85%',
          }}
        >
          <span>{aiText}</span>
          <span
            style={{
              display: 'inline-block',
              width: 3,
              height: 20,
              marginLeft: 4,
              verticalAlign: 'middle',
              backgroundColor: '#c084fc',
              boxShadow: '0 0 10px #c084fc',
              opacity: (frame % 16 < 8) ? 1 : 0,
            }}
          />
        </div>
      </div>
    </div>
  );
};
