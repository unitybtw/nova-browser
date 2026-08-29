import React from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface DiaGradientProps {
  className?: string;
  intensity?: number;
}

export const DiaGradient: React.FC<DiaGradientProps> = ({
  className = "",
  intensity = 1.0,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`relative w-full h-full overflow-hidden bg-[#0c0d12] pointer-events-none select-none ${className}`}
    >
      {/* 1. Base Dark Void Horizon with deep Indigo/Cyan Ambient Glow */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background: "radial-gradient(ellipse 90% 100% at 50% 100%, rgba(67, 56, 202, 0.45) 0%, rgba(30, 27, 75, 0.3) 40%, rgba(12, 13, 18, 0) 100%)",
        }}
      />

      {/* 2. Primary Luminous Aurora Wave (Electric Indigo & Sky Cyan) */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                scaleY: [0.85, 1.15, 0.9, 1.1, 0.85],
                scaleX: [0.95, 1.05, 0.98, 1.03, 0.95],
                x: ["-3%", "3%", "-2%", "2%", "-3%"],
                opacity: [0.75 * intensity, 0.95 * intensity, 0.7 * intensity, 0.9 * intensity, 0.75 * intensity],
              }
        }
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-x-[-10%] bottom-0 h-[140%] origin-bottom blur-2xl will-change-transform"
        style={{
          background: "radial-gradient(ellipse 65% 90% at 50% 100%, rgba(0, 194, 255, 0.6) 0%, rgba(67, 56, 202, 0.5) 35%, rgba(129, 140, 248, 0.25) 60%, transparent 85%)",
          transform: "translateZ(0)",
        }}
      />

      {/* 3. Secondary Chromatic Wave (Deep Violet & Azure Ribbon - Counter oscillating) */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                scaleY: [1.1, 0.8, 1.15, 0.85, 1.1],
                scaleX: [1.03, 0.94, 1.05, 0.96, 1.03],
                x: ["4%", "-4%", "3%", "-2%", "4%"],
                opacity: [0.65 * intensity, 0.85 * intensity, 0.6 * intensity, 0.8 * intensity, 0.65 * intensity],
              }
        }
        transition={{
          duration: 13,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-x-[-15%] bottom-0 h-[120%] origin-bottom blur-3xl will-change-transform"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 45% 100%, rgba(168, 85, 247, 0.5) 0%, rgba(56, 189, 248, 0.4) 40%, rgba(30, 27, 75, 0.3) 70%, transparent 90%)",
          transform: "translateZ(0)",
        }}
      />

      {/* 4. Horizon Core High-Intensity Light Flare */}
      <motion.div
        animate={
          prefersReducedMotion
            ? undefined
            : {
                opacity: [0.6, 0.9, 0.55, 0.85, 0.6],
                scaleY: [0.9, 1.1, 0.95, 1.05, 0.9],
              }
        }
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute inset-x-0 bottom-0 h-16 sm:h-24 blur-xl origin-bottom will-change-transform"
        style={{
          background: "radial-gradient(ellipse 80% 100% at 50% 100%, rgba(255, 255, 255, 0.4) 0%, rgba(129, 140, 248, 0.5) 30%, rgba(67, 56, 202, 0.3) 60%, transparent 90%)",
          transform: "translateZ(0)",
        }}
      />

      {/* 5. Seamless Bottom & Edge Vignette matching Deep Obsidian #0c0d12 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(12, 13, 18, 0.85) 0%, transparent 35%, transparent 70%, rgba(12, 13, 18, 0.95) 100%)",
        }}
      />
    </div>
  );
};

export default DiaGradient;
