import React, { useEffect, useState } from "react";

export type Stop = { offset: number; color: string };

// Nova Browser's Sovereign Cyber-Aurora Palette
export const NOVA_STOPS: Stop[] = [
  { offset: 0, color: "#0c0d12" }, // Deep Void Black
  { offset: 0.18, color: "#1e1b4b" }, // Midnight Indigo
  { offset: 0.34, color: "#4338ca" }, // Sovereign Indigo
  { offset: 0.50, color: "#0078bf" }, // Cobalt Cyan
  { offset: 0.66, color: "#38bdf8" }, // Electric Sky
  { offset: 0.80, color: "#818cf8" }, // Ethereal Periwinkle
  { offset: 0.92, color: "#a855f7" }, // Neural Violet
  { offset: 1, color: "#38bdf800" }, // Transparent Bloom Fade
];

export const CLASSIC_DIA_STOPS: Stop[] = [
  { offset: 0, color: "#340B05" },
  { offset: 0.1827, color: "#0358F7" },
  { offset: 0.2837, color: "#5092C7" },
  { offset: 0.4135, color: "#E1ECFE" },
  { offset: 0.5866, color: "#FFD400" },
  { offset: 0.6827, color: "#FA3D1D" },
  { offset: 0.8029, color: "#FD02F5" },
  { offset: 1, color: "#FFC0FD00" },
];

const VBW = 1271;
const VBH = 599;

function bellHeights(n: number, peak: number, valley: number): number[] {
  const out: number[] = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const t = mid === 0 ? 0 : Math.abs(i - mid) / mid;
    const eased = 1 - Math.pow(t, 1.24);
    out.push(peak * VBH * (valley + (1 - valley) * eased));
  }
  return out;
}

export interface DiaGradientProps {
  bars?: number;
  blur?: number;
  peak?: number;
  valley?: number;
  stops?: Stop[];
  riseMs?: number;
  className?: string;
}

export const DiaGradient: React.FC<DiaGradientProps> = ({
  bars = 11,
  blur = 20,
  peak = 0.98,
  valley = 0.48,
  stops = NOVA_STOPS,
  riseMs = 1100,
  className = "",
}) => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(true);
      return;
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setShown(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  const heights = bellHeights(bars, peak, valley);
  const colW = VBW / bars;

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        height: "100%",
        width: "100%",
        transformOrigin: "bottom",
        transform: shown ? "scaleY(1)" : "scaleY(0)",
        transition: `transform ${riseMs}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        willChange: "transform",
      }}
    >
      <svg
        style={{ height: "100%", width: "100%" }}
        viewBox={`0 0 ${VBW} ${VBH}`}
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="nova-dia-grad" x1="0" y1="1" x2="0" y2="0">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <filter id="nova-dia-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        </defs>
        {heights.map((h, i) => (
          <g key={i} filter="url(#nova-dia-blur)">
            <rect
              x={i * colW}
              y={VBH - h}
              width={colW * 1.25}
              height={h}
              fill="url(#nova-dia-grad)"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default DiaGradient;
