import React, { useEffect, useRef } from "react";
import { BlurReveal } from "./engine";

export interface BlurRevealCardProps {
  className?: string;
}

export const BlurRevealCard: React.FC<BlurRevealCardProps> = ({
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const instance = new BlurReveal(container);
    let onScreen = false;
    let hidden = false;

    const sync = () => {
      if (reduced) return;
      if (onScreen && !hidden) instance.start();
      else instance.stop();
    };

    if (reduced) {
      instance.renderStill();
    } else {
      sync();
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => instance.refreshFont()).catch(() => {});
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.15 },
    );
    io.observe(container);

    const onVis = () => {
      hidden = document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      instance.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Looping WebGL mask-reveal statement showcase for Nova Browser"
      className={`relative select-none overflow-hidden rounded-2xl border border-white/10 shadow-2xl ${className}`}
    />
  );
};

export default BlurRevealCard;
