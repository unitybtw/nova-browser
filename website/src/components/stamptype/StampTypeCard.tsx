import React, { useEffect, useRef } from "react";
import { StampType } from "./engine";
import { WORLDS } from "./params";

interface StampTypeCardProps {
  bare?: boolean;
  className?: string;
}

export const StampTypeCard: React.FC<StampTypeCardProps> = ({
  bare = false,
  className = "",
}) => {
  void bare;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let engine: StampType | null = null;
    let onScreen = false;
    let hidden = false;

    const sync = () => {
      if (!engine || reduced) return;
      if (onScreen && !hidden) engine.start();
      else engine.stop();
    };

    const raf = requestAnimationFrame(() => {
      if (!canvasRef.current) return;
      engine = new StampType(canvas);
      if (!engine.ok) return;
      if (reduced) engine.renderStill();
      else sync();

      if (document.fonts?.load) {
        document.fonts
          .load(`700 1em "IBM Plex Sans"`)
          .then(() => engine?.setFont(`"IBM Plex Sans", sans-serif`), () => {});
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
      aria-label="A looping kinetic-type poster for Nova Browser: lines of type on flat highlight bars fly in, park to be read, and scatter off with solid print-like residue across dynamic color worlds."
      style={{ backgroundColor: WORLDS[0].bg }}
      className={`relative mx-auto aspect-[1344/620] w-full select-none overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl transition-all ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
};

export default StampTypeCard;
