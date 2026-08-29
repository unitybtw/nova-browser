import React, { useEffect, useRef, useState } from "react";

export type GradientStop = { offset: number; color: string };

// Dia's signature stops, bottom (0) → top (1): dark ember → blue → near-white → yellow → red-orange → magenta → transparent pink.
export const DEFAULT_DIA_STOPS: GradientStop[] = [
  { offset: 0, color: "#340B05" },
  { offset: 0.1827, color: "#0358F7" },
  { offset: 0.2837, color: "#5092C7" },
  { offset: 0.4135, color: "#E1ECFE" },
  { offset: 0.5866, color: "#FFD400" },
  { offset: 0.6827, color: "#FA3D1D" },
  { offset: 0.8029, color: "#FD02F5" },
  { offset: 1, color: "#FFC0FD00" },
];

// Nova's signature sovereign cyber-aurora stops
export const NOVA_AURORA_STOPS: GradientStop[] = [
  { offset: 0, color: "#0f0728" },
  { offset: 0.18, color: "#4338ca" },
  { offset: 0.32, color: "#0078bf" },
  { offset: 0.45, color: "#e0e7ff" },
  { offset: 0.62, color: "#f59e0b" },
  { offset: 0.76, color: "#ec4899" },
  { offset: 0.88, color: "#8b5cf6" },
  { offset: 1, color: "#8b5cf600" },
];

const VBW = 1271;
const VBH = 599;

function bellHeights(n: number, peak: number, valley: number): number[] {
  const out: number[] = [];
  const mid = (n - 1) / 2;
  for (let i = 0; i < n; i++) {
    const t = mid === 0 ? 0 : Math.abs(i - mid) / mid; // 0 center → 1 edge
    const eased = 1 - Math.pow(t, 1.24); // 1 at center → 0 at edge
    out.push(peak * VBH * (valley + (1 - valley) * eased));
  }
  return out;
}

export interface DiaGradientProps {
  bars?: number;
  blur?: number;
  peak?: number;
  valley?: number;
  stops?: GradientStop[];
  riseMs?: number;
  className?: string;
}

export const DiaGradient: React.FC<DiaGradientProps> = ({
  bars = 11,
  blur = 22,
  peak = 0.98,
  valley = 0.48,
  stops = DEFAULT_DIA_STOPS,
  riseMs = 1200,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShown(true);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const heights = bellHeights(bars, peak, valley);
  const colW = VBW / bars;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      style={{
        transformOrigin: "bottom center",
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
          <linearGradient id="dia-grad-footer" x1="0" y1="1" x2="0" y2="0">
            {stops.map((s, i) => (
              <stop key={i} offset={s.offset} stopColor={s.color} />
            ))}
          </linearGradient>
          <filter id="dia-blur-footer" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={blur} />
          </filter>
        </defs>
        {heights.map((h, i) => (
          <g key={i} filter="url(#dia-blur-footer)">
            <rect
              x={i * colW}
              y={VBH - h}
              width={colW * 1.28}
              height={h}
              fill="url(#dia-grad-footer)"
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

export default DiaGradient;
