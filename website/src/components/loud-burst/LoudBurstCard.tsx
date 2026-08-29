import React, { useEffect, useRef } from "react";
import { LoudBurst } from "./engine";
import { FONT_CSS, FONT_WEIGHT } from "./params";

interface LoudBurstCardProps {
  bare?: boolean;
  className?: string;
}

export const LoudBurstCard: React.FC<LoudBurstCardProps> = ({
  bare = false,
  className = "",
}) => {
  void bare;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let engine: LoudBurst | null = null;
    let onScreen = false;
    let hidden = false;
    let started = false;

    const sync = () => {
      if (!engine || reduced) return;
      if (onScreen && !hidden) engine.start();
      else engine.stop();
    };

    const resolveFamily = () => {
      const probe = document.createElement("span");
      probe.style.cssText = "position:absolute;visibility:hidden";
      probe.style.fontFamily = FONT_CSS;
      probe.textContent = "Ag";
      document.body.appendChild(probe);
      const fam = getComputedStyle(probe)
        .fontFamily.split(",")[0]
        .replace(/["']/g, "")
        .trim();
      probe.remove();
      return fam;
    };

    const startEngine = (family?: string) => {
      if (started || !canvasRef.current) return;
      started = true;
      engine = new LoudBurst(canvas, family ? `"${family}", sans-serif` : undefined);
      if (!engine.ok) return;
      if (reduced) engine.renderStill();
      else sync();
    };

    const hasFontApi =
      typeof document !== "undefined" && "fonts" in document && !!document.fonts;
    const raf = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      const fam = hasFontApi ? resolveFamily() : "";
      if (hasFontApi && fam) {
        const to = window.setTimeout(() => startEngine(fam), 350);
        const go = () => {
          window.clearTimeout(to);
          startEngine(fam);
        };
        document.fonts.load(`${FONT_WEIGHT} 1em "${fam}"`).then(go, go);
      } else {
        startEngine();
      }
    });

    const io = new IntersectionObserver(
      (es) => {
        onScreen = es[0]?.isIntersecting ?? false;
        sync();
      },
      { threshold: 0.15 },
    );
    io.observe(canvas);

    const onVis = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    let rt = 0;
    const onResize = () => {
      window.clearTimeout(rt);
      rt = window.setTimeout(() => engine?.resize(), 120);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(rt);
      engine?.destroy();
    };
  }, []);

  return (
    <div
      data-canvas-card
      role="img"
      aria-label="A kinetic typography loop on cream paper: sovereign browser sentences type in word by word, the key word bursts into colorful strokes, and the canvas resets smoothly."
      className={`relative mx-auto aspect-[1344/580] w-full select-none overflow-hidden rounded-2xl border border-neutral-200/80 bg-[#fcfbf9] shadow-xs ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
};

export default LoudBurstCard;
