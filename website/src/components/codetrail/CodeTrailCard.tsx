import React, { useEffect, useRef, useState } from "react";
import {
  Drift,
  FONT_RATIO,
  LINE_RATIO,
  PAD_RATIO,
  ROWS,
  STEP_RATIO,
  badgeCount,
  chaseRate,
  makeRowFactory,
  presence,
  type Row,
} from "./engine";

const MIN_TRAVEL_RATIO = 0.055;

export interface CodeTrailCardProps {
  bare?: boolean;
  className?: string;
}

export const CodeTrailCard: React.FC<CodeTrailCardProps> = ({
  bare = false,
  className = "",
}) => {
  void bare;
  const hostRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [rows, setRows] = useState<Row[]>([]);
  const rowsRef = useRef<Row[]>([]);
  const [metrics, setMetrics] = useState({ font: 14, line: 18, pad: 2 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = host.clientWidth;
    let h = host.clientHeight;
    let font = 14;
    let line = 18;
    let step = 26;

    const buildRow = makeRowFactory();
    const drift = new Drift(w, h);

    const resize = () => {
      if (!host) return;
      w = host.clientWidth;
      h = host.clientHeight;
      font = Math.max(10, w * FONT_RATIO);
      line = font * LINE_RATIO;
      step = line * STEP_RATIO;
      drift.resize(w, h);
      setMetrics({ font, line, pad: font * PAD_RATIO });
    };

    resize();

    const seed: Row[] = [];
    for (let i = 0; i < ROWS; i++) {
      const r = buildRow();
      r.slot = i;
      r.pos = reduced
        ? { x: w * 0.72 - i * step, y: h * 0.16 + i * line }
        : { x: w * 0.62 - i * step, y: h * 0.28 + i * line };
      seed.push(r);
    }
    rowsRef.current = seed;
    setRows(seed);

    let headTarget = { x: w * 0.62, y: h * 0.28 };
    let pointerInside = false;
    let lastPush = { ...headTarget };

    let raf = 0;
    let last = 0;
    let running = false;
    let onScreen = false;
    let hidden = false;

    const push = () => {
      const born = buildRow();
      born.pos = { ...headTarget };
      born.slot = 0;
      const next: Row[] = [born];
      for (const r of rowsRef.current) {
        if (r.slot + 1 >= ROWS) continue;
        r.slot += 1;
        next.push(r);
      }
      rowsRef.current = next;
      setRows(next);
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(64, now - last) : 16;
      last = now;

      if (!pointerInside) headTarget = drift.step(dt);

      const list = rowsRef.current;

      for (let i = 0; i < list.length; i++) {
        const r = list[i];
        if (i === 0) {
          const k = chaseRate();
          r.pos.x += (headTarget.x - r.pos.x) * k;
          r.pos.y += (headTarget.y - r.pos.y) * k;
          continue;
        }
        const p = list[i - 1];

        const tx = p.pos.x - step;
        const ty = p.pos.y + line;
        const k = chaseRate();
        r.pos.x += (tx - r.pos.x) * k;
        r.pos.y += (ty - r.pos.y) * k;
      }

      for (const r of list) {
        const el = rowRefs.current.get(r.id);
        if (!el) continue;
        el.style.transform = `translate3d(${r.pos.x.toFixed(2)}px, ${r.pos.y.toFixed(2)}px, 0)`;

        const pr = presence(r.slot, ROWS);
        el.style.opacity = pr.toFixed(3);
        el.style.zIndex = String(ROWS - r.slot);
      }

      const travelled = Math.hypot(
        headTarget.x - lastPush.x,
        headTarget.y - lastPush.y,
      );
      if (travelled >= w * MIN_TRAVEL_RATIO) {
        lastPush = { ...headTarget };
        push();
      }

      if (running) raf = requestAnimationFrame(frame);
    };

    const sync = () => {
      const should = onScreen && !hidden && !reduced;
      if (should === running) return;
      running = should;
      if (should) {
        last = 0;
        raf = requestAnimationFrame(frame);
      } else if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };

    const onPointer = (e: PointerEvent) => {
      if (reduced) return;
      const rect = host.getBoundingClientRect();
      pointerInside = true;
      headTarget = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => {
      pointerInside = false;
      drift.reseed(headTarget);
    };

    const io = new IntersectionObserver(
      (es) => {
        onScreen = es.some((e) => e.isIntersecting);
        sync();
      },
      { rootMargin: "200px" },
    );
    io.observe(host);

    const onVis = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    const ro = new ResizeObserver(() => resize());
    ro.observe(host);

    host.addEventListener("pointermove", onPointer);
    host.addEventListener("pointerleave", onLeave);

    return () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onPointer);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const badgeStyle = (
    b: Row["badges"][number],
    first: boolean,
  ): React.CSSProperties => ({
    background: b.bg,
    color: b.fg,
    height: metrics.line,
    lineHeight: `${metrics.line}px`,
    fontSize: metrics.font,
    padding: `0 ${metrics.pad}px`,
    opacity: b.comment ? 0.72 : 1,
    fontStyle: b.comment ? "italic" : undefined,
    textDecoration: b.underline ? "underline" : undefined,
    textDecorationThickness: b.underline ? "2px" : undefined,
    fontFamily: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace",
    whiteSpace: "pre",
    flex: "0 0 auto",
    boxShadow: first ? "0 1px 2px rgba(16, 22, 40, 0.16)" : undefined,
  });

  return (
    <div
      ref={hostRef}
      data-canvas-card
      role="img"
      aria-label="A trail of code fragments on brightly coloured bars, stacked into a staircase that follows the pointer across the card"
      className={`relative w-full select-none overflow-hidden rounded-2xl border border-neutral-800 bg-[#0f1117] shadow-inner ${className}`}
    >
      {rows.map((r) => {
        const shown = badgeCount(r.slot, ROWS);
        const visible = r.badges.slice(0, Math.max(1, shown));

        const before = visible.slice(0, r.anchorIndex);
        const after = visible.slice(r.anchorIndex);
        return (
          <div
            key={r.id}
            ref={(el) => {
              if (el) rowRefs.current.set(r.id, el);
              else rowRefs.current.delete(r.id);
            }}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              display: "flex",
              transform: `translate3d(${r.pos.x.toFixed(2)}px, ${r.pos.y.toFixed(2)}px, 0)`,
              zIndex: ROWS - r.slot,
              willChange: "transform, opacity",
            }}
          >
            <div
              style={{
                display: "flex",
                position: "absolute",
                right: 0,
                top: 0,
              }}
            >
              {before.map((b, j) => (
                <span key={`b${j}`} style={badgeStyle(b, j === 0)}>
                  {b.text}
                </span>
              ))}
            </div>
            <div style={{ display: "flex" }}>
              {after.map((b, j) => (
                <span
                  key={`a${j}`}
                  style={badgeStyle(b, j === 0 && before.length === 0)}
                >
                  {b.text}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CodeTrailCard;
