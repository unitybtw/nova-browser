import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const COLORS = {
  obsidian: '#0b0c0e',
  obsidianSurface: '#15181e',
  obsidianBorder: '#262c38',
  stone: '#eef0f3',
  stoneRaised: '#dfe3e9',
  stoneBorder: '#c5ccd8',
  inkDark: '#eef0f3',
  mutedDark: '#9fa8b7',
  inkLight: '#0b0c0e',
  mutedLight: '#4c5360',
  cobalt: '#1f2de6',
  white: '#ffffff',
};

const FONT_CSS = `
@font-face {
  font-family: 'Red Hat Display';
  src: url('${staticFile('launch-film/fonts/red-hat-display-latin-700-normal.woff2')}') format('woff2');
  font-weight: 700;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Display';
  src: url('${staticFile('launch-film/fonts/red-hat-display-latin-900-normal.woff2')}') format('woff2');
  font-weight: 900;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Display';
  src: url('${staticFile('launch-film/fonts/red-hat-display-latin-ext-900-normal.woff2')}') format('woff2');
  font-weight: 900;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Text';
  src: url('${staticFile('launch-film/fonts/red-hat-text-latin-400-normal.woff2')}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Text';
  src: url('${staticFile('launch-film/fonts/red-hat-text-latin-500-normal.woff2')}') format('woff2');
  font-weight: 500;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Text';
  src: url('${staticFile('launch-film/fonts/red-hat-text-latin-ext-400-normal.woff2')}') format('woff2');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'Red Hat Text';
  src: url('${staticFile('launch-film/fonts/red-hat-text-latin-ext-500-normal.woff2')}') format('woff2');
  font-weight: 500;
  font-style: normal;
}
`;

const DISPLAY = "'Red Hat Display', -apple-system, BlinkMacSystemFont, sans-serif";
const TEXT = "'Red Hat Text', -apple-system, BlinkMacSystemFont, sans-serif";

const MonumentWordmark: React.FC<{
  frame: number;
  fps: number;
  size?: number;
}> = ({ frame, fps, size = 228 }) => {
  const reveal = spring({
    frame,
    fps,
    config: { damping: 24, stiffness: 120, mass: 1.0 },
  });
  const ringRot = interpolate(reveal, [0, 1], [-32, 0]);
  const ringScale = interpolate(reveal, [0, 1], [0.84, 1]);
  const letterShift = interpolate(reveal, [0, 1], [28, 0]);
  const clipBottom = interpolate(reveal, [0, 1], [100, 0]);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: size * 0.03,
        fontFamily: DISPLAY,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 0.88,
        letterSpacing: '-0.04em',
        color: COLORS.inkDark,
        userSelect: 'none',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          transform: `translateX(${letterShift}px)`,
          clipPath: `inset(0 0 ${clipBottom}% 0)`,
        }}
      >
        N
      </span>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size * 0.8,
          height: size * 0.8,
          transform: `translateY(${-size * 0.015}px) rotate(${ringRot}deg) scale(${ringScale})`,
          clipPath: `inset(0 0 ${clipBottom}% 0)`,
        }}
      >
        <Img
          src={staticFile('launch-film/nova-mark.svg')}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </span>
      <span
        style={{
          display: 'inline-block',
          transform: `translateX(${-letterShift}px)`,
          clipPath: `inset(0 0 ${clipBottom}% 0)`,
        }}
      >
        VA
      </span>
    </div>
  );
};

const CursorOverlay: React.FC<{
  x: number;
  y: number;
  clickProgress: number;
  opacity: number;
}> = ({ x, y, clickProgress, opacity }) => {
  if (opacity <= 0.01) return null;
  const pressScale =
    clickProgress > 0 && clickProgress < 0.45
      ? interpolate(clickProgress, [0, 0.2, 0.45], [1, 0.86, 1])
      : 1;
  const rippleScale = interpolate(clickProgress, [0, 1], [0.25, 2.3], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rippleOpacity =
    clickProgress > 0 && clickProgress < 1
      ? interpolate(clickProgress, [0, 0.15, 1], [0, 0.75, 0])
      : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        pointerEvents: 'none',
        opacity,
        zIndex: 40,
      }}
    >
      {rippleOpacity > 0.01 && (
        <div
          style={{
            position: 'absolute',
            left: -20,
            top: -20,
            width: 40,
            height: 40,
            borderRadius: 999,
            border: `3px solid ${COLORS.cobalt}`,
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}
      <svg
        width="34"
        height="34"
        viewBox="0 0 28 28"
        style={{
          transform: `scale(${pressScale})`,
          transformOrigin: 'top left',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.45))',
        }}
      >
        <path
          d="M4 2.5L4 23.5L9.5 18.2L13.6 25.5L16.7 23.8L12.7 16.6L20.5 16.6L4 2.5Z"
          fill="#ffffff"
          stroke="#0b0c0e"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

/* ============================================================================
 * ACT 1: Monumental Open (0s -> 6.0s | 360 frames | Obsidian #0b0c0e)
 * ========================================================================== */
const Act1Open: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const metaOpacity = interpolate(frame, [24, 62], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const metaY = interpolate(frame, [24, 62], [18, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const subReveal = spring({
    frame: Math.max(0, frame - 42),
    fps,
    config: { damping: 24, stiffness: 130 },
  });

  const exitScale = interpolate(frame, [332, 360], [1, 0.965], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitOpacity = interpolate(frame, [338, 360], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.obsidian,
        color: COLORS.inkDark,
        padding: '64px 96px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      {/* Top editorial bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontFamily: TEXT,
          fontSize: 18,
          fontWeight: 500,
          letterSpacing: '0.02em',
          color: COLORS.mutedDark,
          opacity: metaOpacity,
          transform: `translateY(${metaY}px)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Img
            src={staticFile('launch-film/nova-icon.svg')}
            style={{ width: 28, height: 28 }}
          />
          <span style={{ color: COLORS.inkDark, fontFamily: DISPLAY, fontWeight: 900, fontSize: 22 }}>
            nova<span style={{ color: COLORS.cobalt }}>.</span>
          </span>
        </div>
        <span>RELEASE v1.5.2 · MIT OPEN SOURCE</span>
      </div>

      {/* Center monumental NOVA with Orbital Eclipse Ring */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MonumentWordmark frame={Math.max(0, frame - 10)} fps={fps} size={244} />
      </div>

      {/* Bottom 3-column architectural footer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.4fr 1fr',
          alignItems: 'end',
          gap: 32,
          fontFamily: TEXT,
          opacity: subReveal,
          transform: `translateY(${interpolate(subReveal, [0, 1], [22, 0])}px)`,
        }}
      >
        <div style={{ fontSize: 18, color: COLORS.mutedDark }}>
          macOS · Windows · Linux
        </div>
        <div
          style={{
            fontSize: 26,
            lineHeight: 1.32,
            color: COLORS.inkDark,
            fontWeight: 500,
            textAlign: 'center',
          }}
        >
          The open-source desktop browser you reshape live.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <span
            style={{
              backgroundColor: COLORS.cobalt,
              color: COLORS.white,
              padding: '12px 24px',
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            nova-browser.org
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================================
 * ACT 2: HERO — Live Design Studio (6.0s -> 16.0s | 600 frames | Cool Stone)
 * ========================================================================== */
const STUDIO_MODES = [
  { id: 'classic', label: 'Classic Top', file: 'launch-film/screens/studio-classic-top.jpg', start: 0 },
  { id: 'compact', label: 'Compact Row', file: 'launch-film/screens/studio-compact.jpg', start: 120 },
  { id: 'vleft', label: 'Vertical Left', file: 'launch-film/screens/studio-vertical-left.jpg', start: 246 },
  { id: 'vright', label: 'Vertical Right', file: 'launch-film/screens/studio-vertical-right.jpg', start: 372 },
  { id: 'light', label: 'Light Surface', file: 'launch-film/screens/studio-light.jpg', start: 486 },
] as const;

const Act2LiveDesignStudio: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({
    frame,
    fps,
    config: { damping: 24, stiffness: 150 },
  });

  // Determine active layout index matching exact click timestamps:
  // 0f (6.0s), 120f (8.0s), 246f (10.1s), 372f (12.2s), 486f (14.1s)
  let activeIdx = 0;
  for (let i = 0; i < STUDIO_MODES.length; i++) {
    if (frame >= STUDIO_MODES[i].start) activeIdx = i;
  }

  const snapAge = frame - STUDIO_MODES[activeIdx].start;
  const snapPop =
    activeIdx === 0
      ? 1
      : interpolate(
          spring({ frame: snapAge, fps, config: { damping: 20, stiffness: 260 } }),
          [0, 0.5, 1],
          [0.992, 1.007, 1.0]
        );

  // Subtle slow cinema zoom across the 10-second hero showcase without clipping sidebar edges
  const slowZoom = interpolate(frame, [0, 600], [1.0, 1.012], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Cursor choreography across exact real Live Design Studio button positions
  // Coordinates are percentages within the 1440x900 browser window!
  const cursorX = interpolate(
    frame,
    [0, 50, 114, 145, 240, 275, 366, 400, 480, 530],
    [62, 74, 91.5, 91.5, 80.5, 80.5, 91.5, 91.5, 78.0, 72.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cursorY = interpolate(
    frame,
    [0, 50, 114, 145, 240, 275, 366, 400, 480, 530],
    [52, 42, 31.8, 31.8, 39.2, 39.2, 39.2, 39.2, 19.5, 24.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const cursorOpacity = interpolate(frame, [28, 46, 510, 540], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Compute click ripple progress near each exact click frame (120, 246, 372, 486)
  const clickFrames = [120, 246, 372, 486];
  let clickProgress = 0;
  for (const cf of clickFrames) {
    const dt = frame - cf;
    if (dt >= 0 && dt <= 28) {
      clickProgress = dt / 28;
      break;
    }
  }

  const isLightMode = activeIdx === 4;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.stone,
        color: COLORS.inkLight,
        padding: '44px 80px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      {/* Top editorial bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
          transform: `translateY(${interpolate(enter, [0, 1], [24, 0])}px)`,
          opacity: enter,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: TEXT,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: COLORS.cobalt,
            }}
          >
            LIVE DESIGN STUDIO
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 54,
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              color: COLORS.inkLight,
            }}
          >
            Reshape every bar live.
          </h2>
        </div>

        {/* Exact 4 geometries + Light mode status strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {STUDIO_MODES.map((mode, idx) => {
            const isActive = idx === activeIdx;
            return (
              <div
                key={mode.id}
                style={{
                  padding: '11px 18px',
                  fontFamily: TEXT,
                  fontSize: 16,
                  fontWeight: 500,
                  backgroundColor: isActive ? COLORS.cobalt : COLORS.stoneRaised,
                  color: isActive ? COLORS.white : COLORS.inkLight,
                }}
              >
                {mode.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Real 2x Retina Nova v1.5.2 browser window */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translateY(${interpolate(enter, [0, 1], [34, 0])}px)`,
          opacity: enter,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 1416,
            height: 885,
            borderRadius: 12,
            overflow: 'hidden',
            backgroundColor: isLightMode ? '#f8fafc' : COLORS.obsidian,
            border: `1px solid ${isLightMode ? COLORS.stoneBorder : COLORS.obsidianBorder}`,
            boxShadow: '0 32px 84px rgba(11, 12, 14, 0.22)',
            transform: `scale(${snapPop})`,
          }}
        >
          <Img
            src={staticFile(STUDIO_MODES[activeIdx].file)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${slowZoom})`,
              transformOrigin: '50% 45%',
            }}
          />
          <CursorOverlay
            x={cursorX}
            y={cursorY}
            clickProgress={clickProgress}
            opacity={cursorOpacity}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================================
 * ACT 3: Vertical Workspaces & Split View (16.0s -> 23.0s | 420 frames | Dark)
 * ========================================================================== */
const Act3WorkspacesSplit: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Beat 3A: 0..204f (16.0 -> 19.4s) Vertical Workspaces
  // Beat 3B: 204..420f (19.4 -> 23.0s) Dual Split View
  const isSplit = frame >= 204;

  const enterA = spring({ frame, fps, config: { damping: 24, stiffness: 145 } });
  const enterB = spring({
    frame: Math.max(0, frame - 204),
    fps,
    config: { damping: 24, stiffness: 160 },
  });

  if (!isSplit) {
    const zoomA = interpolate(frame, [0, 204], [1.0, 1.025], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.obsidian,
          color: COLORS.inkDark,
          padding: '64px 88px',
          display: 'grid',
          gridTemplateColumns: '500px 1fr',
          gap: 56,
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            opacity: enterA,
            transform: `translateY(${interpolate(enterA, [0, 1], [28, 0])}px)`,
          }}
        >
          <span
            style={{
              fontFamily: TEXT,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: COLORS.cobalt,
            }}
          >
            WORKSPACES & MEMORY
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 70,
              lineHeight: 0.94,
              letterSpacing: '-0.04em',
              color: COLORS.inkDark,
            }}
          >
            Vertical
            <br />
            workspaces.
          </h2>
          <p
            style={{
              margin: 0,
              fontFamily: TEXT,
              fontSize: 22,
              lineHeight: 1.5,
              color: COLORS.mutedDark,
            }}
          >
            Keep Personal, Work, and Research tabs isolated in collapsible folders while dormant tabs sleep automatically.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 8 }}>
            {['Pinned Tools', 'Tab Folders', 'Auto Hibernation'].map((tag) => (
              <span
                key={tag}
                style={{
                  backgroundColor: COLORS.obsidianSurface,
                  color: COLORS.inkDark,
                  padding: '10px 16px',
                  fontFamily: TEXT,
                  fontSize: 16,
                  fontWeight: 500,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            width: '100%',
            aspectRatio: '16 / 10',
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${COLORS.obsidianBorder}`,
            backgroundColor: COLORS.obsidianSurface,
            opacity: enterA,
            transform: `translateX(${interpolate(enterA, [0, 1], [44, 0])}px)`,
          }}
        >
          <Img
            src={staticFile('launch-film/screens/vertical-workspaces.jpg')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoomA})`,
              transformOrigin: '50% 45%',
            }}
          />
        </div>
      </AbsoluteFill>
    );
  }

  // Beat 3B: Dual Split View full-width architectural showcase
  const zoomB = interpolate(frame, [204, 420], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.obsidian,
        color: COLORS.inkDark,
        padding: '44px 80px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          opacity: enterB,
          transform: `translateY(${interpolate(enterB, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: TEXT,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: COLORS.cobalt,
            }}
          >
            DUAL SPLIT VIEW
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 54,
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              color: COLORS.inkDark,
            }}
          >
            Two pages, one window.
          </h2>
        </div>

        <span
          style={{
            backgroundColor: COLORS.cobalt,
            color: COLORS.white,
            padding: '12px 22px',
            fontFamily: TEXT,
            fontSize: 17,
            fontWeight: 500,
          }}
        >
          Resizable Split Divider
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: enterB,
          transform: `scale(${interpolate(enterB, [0, 1], [0.97, 1])})`,
        }}
      >
        <div
          style={{
            width: 1416,
            height: 885,
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${COLORS.obsidianBorder}`,
            backgroundColor: COLORS.obsidianSurface,
          }}
        >
          <Img
            src={staticFile('launch-film/screens/split-view.jpg')}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoomB})`,
              transformOrigin: '50% 42%',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================================
 * ACT 4: Local WebGPU AI & Whisper Voice (23.0s -> 30.0s | 420f | Cool Stone)
 * ========================================================================== */
const Act4LocalAI: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 24, stiffness: 145 } });
  const zoomAI = interpolate(frame, [0, 420], [1.0, 1.025], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const specs: Array<[string, string]> = [
    ['Neural engine', 'WebGPU / WebLLM'],
    ['Speech engine', 'Local Whisper ONNX'],
    ['Cloud telemetry', '0 KB transmitted'],
  ];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.stone,
        color: COLORS.inkLight,
        padding: '64px 88px',
        display: 'grid',
        gridTemplateColumns: '500px 1fr',
        gap: 56,
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [28, 0])}px)`,
        }}
      >
        <span
          style={{
            fontFamily: TEXT,
            fontSize: 16,
            fontWeight: 500,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: COLORS.cobalt,
          }}
        >
          ON-DEVICE INTELLIGENCE
        </span>
        <h2
          style={{
            margin: 0,
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 70,
            lineHeight: 0.94,
            letterSpacing: '-0.04em',
            color: COLORS.inkLight,
          }}
        >
          Help on
          <br />
          your GPU.
        </h2>
        <p
          style={{
            margin: 0,
            fontFamily: TEXT,
            fontSize: 22,
            lineHeight: 1.5,
            color: COLORS.mutedLight,
          }}
        >
          Summon Nova Assistant beside any tab. Supported language models and Whisper speech run directly on your hardware.
        </p>

        {/* Clean editorial spec list matching website Open Source table */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            paddingTop: 12,
            fontFamily: TEXT,
            fontSize: 18,
          }}
        >
          {specs.map(([label, value]) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                padding: '12px 16px',
                backgroundColor: COLORS.stoneRaised,
              }}
            >
              <span style={{ color: COLORS.inkLight, fontWeight: 500 }}>{label}</span>
              <span style={{ color: COLORS.mutedLight }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 10',
          borderRadius: 12,
          overflow: 'hidden',
          border: `1px solid ${COLORS.obsidianBorder}`,
          boxShadow: '0 28px 72px rgba(11, 12, 14, 0.2)',
          backgroundColor: COLORS.obsidian,
          opacity: enter,
          transform: `translateX(${interpolate(enter, [0, 1], [44, 0])}px)`,
        }}
      >
        <Img
          src={staticFile('launch-film/screens/local-ai.jpg')}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${zoomAI})`,
            transformOrigin: '50% 45%',
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================================
 * ACT 5: CRX3 Extensions, Local MCP & Shield/Sync (30.0s -> 36.0s | 360f)
 * ========================================================================== */
const Act5ExtensionsSecurity: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Beat 5A: 0..180f (30.0 -> 33.0s) Chrome Web Store CRX3 + Local MCP
  // Beat 5B: 180..360f (33.0 -> 36.0s) Built-in Ad Shield + AES-256-GCM Sync
  const isSync = frame >= 180;
  const localFrame = isSync ? frame - 180 : frame;
  const enter = spring({ frame: localFrame, fps, config: { damping: 24, stiffness: 165 } });
  const zoom = interpolate(localFrame, [0, 180], [1.02, 1.12], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.obsidian,
        color: COLORS.inkDark,
        padding: '48px 80px 44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 32,
          opacity: enter,
          transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span
            style={{
              fontFamily: TEXT,
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: COLORS.cobalt,
            }}
          >
            {isSync ? 'PRIVACY & ENCRYPTED SYNC' : 'EXTENSIONS & CODING AGENTS'}
          </span>
          <h2
            style={{
              margin: 0,
              fontFamily: DISPLAY,
              fontWeight: 900,
              fontSize: 54,
              lineHeight: 0.96,
              letterSpacing: '-0.035em',
              color: COLORS.inkDark,
            }}
          >
            {isSync ? 'Shielded and encrypted.' : 'Chrome Web Store & MCP.'}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {(isSync
            ? ['EasyList Network Shield', 'AES-256-GCM Sync']
            : ['Direct CRX3 Installer', '26-Tool Local MCP · Port 3020']
          ).map((badge, idx) => (
            <span
              key={badge}
              style={{
                backgroundColor: idx === 1 ? COLORS.cobalt : COLORS.obsidianSurface,
                color: COLORS.white,
                padding: '12px 20px',
                fontFamily: TEXT,
                fontSize: 16,
                fontWeight: 500,
              }}
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: enter,
          transform: `scale(${interpolate(enter, [0, 1], [0.97, 1])})`,
        }}
      >
        <div
          style={{
            width: 1416,
            height: 885,
            borderRadius: 12,
            overflow: 'hidden',
            border: `1px solid ${COLORS.obsidianBorder}`,
            backgroundColor: COLORS.obsidianSurface,
          }}
        >
          <Img
            src={staticFile(
              isSync
                ? 'launch-film/screens/sync-dialog.jpg'
                : 'launch-film/screens/extensions-modal.jpg'
            )}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${zoom})`,
              transformOrigin: '50% 48%',
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ============================================================================
 * ACT 6: Cobalt Sting -> Monumental Finale (36.0s -> 42.0s | 360 frames)
 * ========================================================================== */
const Act6Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Beat 6A: 0..78f (36.0 -> 37.3s) Electric Cobalt full-bleed stamp
  // Beat 6B: 78..360f (37.3 -> 42.0s) Obsidian Monumental NOVA finale
  if (frame < 78) {
    const pop = spring({ frame, fps, config: { damping: 22, stiffness: 180 } });
    return (
      <AbsoluteFill
        style={{
          backgroundColor: COLORS.cobalt,
          color: COLORS.white,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 900,
            fontSize: 120,
            lineHeight: 0.92,
            letterSpacing: '-0.04em',
            textAlign: 'center',
            transform: `translateY(${interpolate(pop, [0, 1], [36, 0])}px)`,
            opacity: pop,
          }}
        >
          Open source.
          <br />
          MIT licensed.
        </div>
      </AbsoluteFill>
    );
  }

  const endFrame = frame - 78;
  const subPop = spring({
    frame: Math.max(0, endFrame - 24),
    fps,
    config: { damping: 24, stiffness: 130 },
  });
  const fadeOut = interpolate(frame, [338, 360], [1, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: COLORS.obsidian,
        color: COLORS.inkDark,
        padding: '72px 96px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 44,
        opacity: fadeOut,
      }}
    >
      <MonumentWordmark frame={endFrame} fps={fps} size={236} />

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 22,
          opacity: subPop,
          transform: `translateY(${interpolate(subPop, [0, 1], [24, 0])}px)`,
        }}
      >
        <div
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: 38,
            letterSpacing: '-0.025em',
            color: COLORS.inkDark,
          }}
        >
          Make the web yours.
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            fontFamily: TEXT,
            fontSize: 20,
            color: COLORS.mutedDark,
          }}
        >
          <span>macOS</span>
          <span>·</span>
          <span>Windows</span>
          <span>·</span>
          <span>Linux</span>
          <span>·</span>
          <span style={{ color: COLORS.inkDark, fontWeight: 500 }}>v1.5.2</span>
        </div>

        <div
          style={{
            marginTop: 8,
            backgroundColor: COLORS.cobalt,
            color: COLORS.white,
            padding: '15px 34px',
            fontFamily: TEXT,
            fontSize: 22,
            fontWeight: 500,
          }}
        >
          nova-browser.org
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const NovaLaunchFilm: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.obsidian }}>
      <style>{FONT_CSS}</style>
      <Audio src={staticFile('launch-film/master-audio.m4a')} />

      {/* Act 1: 0s -> 6s (360 frames) */}
      <Sequence from={0} durationInFrames={360}>
        <Act1Open />
      </Sequence>

      {/* Act 2: 6s -> 16s (600 frames) — Hero: Live Design Studio */}
      <Sequence from={360} durationInFrames={600}>
        <Act2LiveDesignStudio />
      </Sequence>

      {/* Act 3: 16s -> 23s (420 frames) — Vertical Workspaces & Split View */}
      <Sequence from={960} durationInFrames={420}>
        <Act3WorkspacesSplit />
      </Sequence>

      {/* Act 4: 23s -> 30s (420 frames) — Local WebGPU AI & Whisper */}
      <Sequence from={1380} durationInFrames={420}>
        <Act4LocalAI />
      </Sequence>

      {/* Act 5: 30s -> 36s (360 frames) — Chrome Web Store CRX3, MCP & Shield/Sync */}
      <Sequence from={1800} durationInFrames={360}>
        <Act5ExtensionsSecurity />
      </Sequence>

      {/* Act 6: 36s -> 42s (360 frames) — Cobalt Sting & Monumental Finale */}
      <Sequence from={2160} durationInFrames={360}>
        <Act6Finale />
      </Sequence>
    </AbsoluteFill>
  );
};
