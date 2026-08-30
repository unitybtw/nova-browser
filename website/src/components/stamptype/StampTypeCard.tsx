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
    let isVisible = true;

    const checkAndSync = () => {
      if (!engine) return;
      if (reduced) {
        engine.renderStill();
        return;
      }

      const hidden = document.hidden;
      const rect = canvas.getBoundingClientRect();
      const inView = rect.bottom > 0 && rect.top < window.innerHeight;

      if (inView && !hidden) {
        engine.start();
      } else {
        engine.stop();
      }
    };

    // Instantiate engine immediately and start
    engine = new StampType(canvas);
    if (engine.ok) {
      engine.renderStill();
      if (!reduced) {
        engine.start();
      }
    }

    // Font loading observer to re-measure and re-render
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        engine?.setFont(`"IBM Plex Sans", sans-serif`);
        checkAndSync();
      }, () => {});
    }

    // IntersectionObserver for viewport entry/exit
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry?.isIntersecting ?? true;
        if (!engine || reduced) return;
        if (isVisible && !document.hidden) {
          engine.start();
        } else {
          engine.stop();
        }
      },
      { threshold: [0, 0.05, 0.1] },
    );
    io.observe(canvas);

    // ResizeObserver to detect layout / container changes
    const ro = new ResizeObserver(() => {
      if (engine) {
        engine.resize();
        checkAndSync();
      }
    });
    ro.observe(canvas);

    const onVis = () => checkAndSync();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);

    return () => {
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);
      engine?.destroy();
    };
  }, []);

  return (
    <div
      data-canvas-card
      role="img"
      aria-label="A looping kinetic-type poster for Nova Browser: lines of type on flat highlight bars fly in, park to be read, and scatter off with solid print-like residue across dynamic color worlds."
      style={{ backgroundColor: WORLDS[0].bg }}
      className={`relative w-full h-full select-none overflow-hidden ${className}`}
    >
      <canvas ref={canvasRef} className="h-full w-full block" />
    </div>
  );
};

export default StampTypeCard;
