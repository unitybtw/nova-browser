import React, { useEffect, useRef } from "react";
import { RevealGL, renderCornerText } from "./reveal-gl";

const TEXT_PAIRS: { top: string[]; bottom: string[] }[] = [
  {
    top: ["The browser is no longer a window,", "it is the engine."],
    bottom: ["Run multi-model intelligence", "strictly on local hardware."],
  },
  {
    top: ["Zero telemetry. Zero trackers.", "Your machine, your sovereign space."],
    bottom: ["Thought at the speed of thought,", "unmediated by external clouds."],
  },
  {
    top: ["Type can move like weather,", "rolling in from the edge."],
    bottom: ["Hardened network isolation", "with native WebGPU shaders."],
  },
  {
    top: ["Small things, done really well,", "read as calm, not loud."],
    bottom: ["Sovereign autonomous computing", "built for the next era."],
  },
];

const BG = "#fcfbf9";
const INK = "#171717";
const EDGE = "#e5e5e5";

const WHITE_WASH = [
  "radial-gradient(55% 75% at 18% 12%, rgba(255,255,255,0.95), transparent 60%)",
  "radial-gradient(48% 66% at 82% 22%, rgba(255,255,255,0.80), transparent 62%)",
  "radial-gradient(65% 55% at 50% 0%,  rgba(255,255,255,0.70), transparent 55%)",
  "radial-gradient(42% 52% at 8% 85%,  rgba(255,255,255,0.75), transparent 60%)",
  "radial-gradient(52% 60% at 92% 88%, rgba(255,255,255,0.65), transparent 62%)",
  "radial-gradient(38% 38% at 65% 55%, rgba(255,255,255,0.55), transparent 70%)",
  "radial-gradient(85% 46% at 50% 100%,rgba(255,255,255,0.55), transparent 55%)",
  "radial-gradient(28% 28% at 30% 45%, rgba(255,255,255,0.45), transparent 72%)",
].join(", ");

const GRAIN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(#n)' opacity='0.08'/></svg>`
  );

const HOLD_MS = 2200;
const OUT_HOLD_MS = 100;
const MAX_BLUR = 16;
const K_IN = 16;
const K_OUT = 22;
const DAMP = 1.12;

const REVEALED_AT = 0.95;
const GONE_AT = 0.02;
const PARALLAX_AMP = 0.006;

const TL_ANCHOR: [number, number] = [0.16, 0.18];
const BR_ANCHOR: [number, number] = [0.84, 0.82];

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function resolveFamily(cssFamily: string): string {
  const probe = document.createElement("span");
  probe.style.cssText = "position:absolute;visibility:hidden";
  probe.style.fontFamily = cssFamily;
  probe.textContent = "Ag";
  document.body.appendChild(probe);
  const fam = getComputedStyle(probe).fontFamily || "sans-serif";
  document.body.removeChild(probe);
  return fam;
}

function springStep(pos: number, vel: number, target: number, k: number, damp: number, dt: number): [number, number] {
  const c = 2 * Math.sqrt(k) * damp;
  const accel = -k * (pos - target) - c * vel;
  const v = vel + accel * dt;
  return [pos + v * dt, v];
}

export interface TextRevealCardProps {
  className?: string;
}

export const TextRevealCard: React.FC<TextRevealCardProps> = ({ className = "" }) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let W = host.clientWidth || 1;
    let H = host.clientHeight || 1;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let fontFamily = resolveFamily("'IBM Plex Sans', -apple-system, sans-serif");
    const edge = hexToRgb(EDGE);

    const gl = new RevealGL();
    const useGL = gl.available;
    if (useGL) {
      gl.resize(W, H, dpr);
      host.appendChild(gl.canvas);
    }

    let index = 0;
    let seed = 1.7;

    const mount = () => {
      if (!useGL) return;
      const pair = TEXT_PAIRS[index];
      const art = renderCornerText({
        top: pair.top,
        bottom: pair.bottom,
        font: fontFamily,
        fill: INK,
        cardW: W,
        cardH: H,
        dpr,
      });
      gl.setTexture(art);
    };
    mount();

    let pTgtX = 0.5, pTgtY = 0.5;
    let pCurX = 0.5, pCurY = 0.5;
    let cursorUV: [number, number] = [-1, -1];
    let hoverTgt = 0, hoverCur = 0;
    const onMove = (e: PointerEvent) => {
      const b = host.getBoundingClientRect();
      const ux = (e.clientX - b.left) / b.width;
      const uy = (e.clientY - b.top) / b.height;
      pTgtX = ux; pTgtY = uy;
      cursorUV = [ux, uy];
      hoverTgt = 1;
    };
    const onLeave = () => { pTgtX = 0.5; pTgtY = 0.5; hoverTgt = 0; };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);

    let phase: "in" | "hold" | "out" = "in";
    let phaseStart = 0;
    let progress = 0;
    let vel = 0;
    let target = 1;
    let clock = 0;
    let last = 0;
    let raf = 0;
    let running = false;
    let held = 0;

    const loop = () => {
      if (!running) return;
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      clock += dt;

      const k = target > 0.5 ? K_IN : K_OUT;
      [progress, vel] = springStep(progress, vel, target, k, DAMP, dt);

      if (phase === "in") {
        if (progress >= REVEALED_AT) { phase = "hold"; phaseStart = now; }
      } else if (phase === "hold") {
        if (now - phaseStart >= HOLD_MS) { phase = "out"; phaseStart = now; target = 0; }
      } else {
        if (progress <= GONE_AT && now - phaseStart >= OUT_HOLD_MS) {
          index = (index + 1) % TEXT_PAIRS.length;
          seed = ((seed * 1.618) % 7) + 0.3;
          mount();
          phase = "in"; phaseStart = now; progress = 0; vel = 0; target = 1;
        }
      }

      const pk = 1 - Math.pow(0.0009, dt);
      pCurX += (pTgtX - pCurX) * pk;
      pCurY += (pTgtY - pCurY) * pk;
      hoverCur += (hoverTgt - hoverCur) * (1 - Math.pow(0.002, dt));

      const amp = PARALLAX_AMP * hoverCur;
      const parTL: [number, number] = [
        (pCurX - TL_ANCHOR[0]) * amp,
        (pCurY - TL_ANCHOR[1]) * amp,
      ];
      const parBR: [number, number] = [
        (pCurX - BR_ANCHOR[0]) * amp,
        (pCurY - BR_ANCHOR[1]) * amp,
      ];

      const p = Math.max(0, Math.min(1, progress));

      const reverse = phase === "out" ? 1 : 0;
      if (useGL) gl.draw(p, MAX_BLUR, edge, clock, W / Math.max(1, H), seed, parTL, parBR, cursorUV, hoverCur, reverse);

      if (useGL) {
        held += ((phase === "hold" ? 1 : 0) - held) * (1 - Math.pow(0.02, dt));
        const breathe = Math.sin(clock * 0.45) * 0.5 + 0.5;
        const s = 1 + held * breathe * 0.0015;
        const b = 1 + held * (breathe - 0.5) * 0.012;
        gl.canvas.style.transform = `scale(${s.toFixed(4)})`;
        gl.canvas.style.filter = `brightness(${b.toFixed(3)})`;
      }

      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      phase = "in"; phaseStart = performance.now(); last = phaseStart;
      progress = 0; vel = 0; target = 1;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    };

    const renderStill = () => {
      if (useGL) gl.draw(1, 0, edge, 0, W / Math.max(1, H), seed, [0, 0], [0, 0], [-1, -1], 0, 0);
    };

    let onScreen = false;
    let hidden = false;
    const sync = () => {
      if (reduced) return;
      if (onScreen && !hidden) start();
      else stop();
    };

    const io = new IntersectionObserver(
      (es) => { onScreen = es[0]?.isIntersecting ?? false; sync(); },
      { threshold: 0.15 },
    );
    io.observe(host);

    const onVis = () => { hidden = document.hidden; sync(); };
    document.addEventListener("visibilitychange", onVis);

    let resizeT = 0;
    const ro = new ResizeObserver(() => {
      window.clearTimeout(resizeT);
      resizeT = window.setTimeout(() => {
        W = host.clientWidth || 1;
        H = host.clientHeight || 1;
        if (W < 2 || H < 2) return;
        gl.resize(W, H, dpr);
        mount();
      }, 120);
    });
    ro.observe(host);

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        fontFamily = resolveFamily("'IBM Plex Sans', -apple-system, sans-serif");
        mount();
      }).catch(() => {});
    }

    if (reduced) renderStill();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      window.clearTimeout(resizeT);
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      gl.destroy();
    };
  }, []);

  return (
    <div
      ref={hostRef}
      role="img"
      aria-label="Two text blocks in opposite corners materializing through a soft cloudy WebGL mask reveal."
      className={`relative select-none overflow-hidden rounded-2xl border ${className}`}
      style={{ backgroundColor: BG, borderColor: EDGE }}
    >
      <div
        className="pointer-events-none absolute"
        style={{ inset: "-8%", backgroundImage: WHITE_WASH }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("${GRAIN_SVG}")`,
          backgroundSize: "140px 140px",
          opacity: 0.05,
          mixBlendMode: "multiply",
        }}
      />
    </div>
  );
};

export default TextRevealCard;
