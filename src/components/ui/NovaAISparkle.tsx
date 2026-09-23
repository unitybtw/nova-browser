import React, { useId } from 'react';

interface NovaAISparkleProps {
  className?: string;
  size?: number;
  active?: boolean;
}

export const NovaAISparkle: React.FC<NovaAISparkleProps> = ({
  className = '',
  size = 16,
  active = false,
}) => {
  const rawId = useId();
  const id = rawId.replace(/[^a-zA-Z0-9]/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`overflow-visible shrink-0 ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Animated Color Shift Linear Gradient */}
        <linearGradient id={`ai-grad-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee">
            <animate
              attributeName="stop-color"
              values="#22d3ee;#38bdf8;#818cf8;#a855f7;#06b6d4;#22d3ee"
              dur={active ? '3.5s' : '6s'}
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="45%" stopColor="#38bdf8">
            <animate
              attributeName="stop-color"
              values="#38bdf8;#818cf8;#a855f7;#22d3ee;#38bdf8;#38bdf8"
              dur={active ? '3.5s' : '6s'}
              repeatCount="indefinite"
            />
          </stop>
          <stop offset="100%" stopColor="#a855f7">
            <animate
              attributeName="stop-color"
              values="#a855f7;#22d3ee;#38bdf8;#818cf8;#a855f7;#a855f7"
              dur={active ? '3.5s' : '6s'}
              repeatCount="indefinite"
            />
          </stop>
        </linearGradient>

        {/* Center Glow Radial Gradient */}
        <radialGradient id={`ai-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
          <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.8" />
          <stop offset="70%" stopColor="#06b6d4" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>

        {/* Soft Bloom Filter */}
        <filter id={`ai-bloom-${id}`} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="0.8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <style>{`
          @keyframes nova-pulse-${id} {
            0%, 100% {
              transform: scale(1) rotate(0deg);
            }
            25% {
              transform: scale(1.08) rotate(3deg);
            }
            50% {
              transform: scale(0.95) rotate(0deg);
            }
            75% {
              transform: scale(1.05) rotate(-3deg);
            }
          }

          @keyframes nova-sparkle-tr-${id} {
            0%, 100% {
              transform: scale(0.65) translate(0, 0);
              opacity: 0.35;
            }
            50% {
              transform: scale(1.25) translate(0.5px, -0.5px);
              opacity: 1;
            }
          }

          @keyframes nova-sparkle-bl-${id} {
            0%, 100% {
              transform: scale(1.2) translate(0, 0);
              opacity: 0.95;
            }
            50% {
              transform: scale(0.55) translate(-0.5px, 0.5px);
              opacity: 0.25;
            }
          }

          @keyframes nova-orbit-${id} {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }

          .nova-star-main-${id} {
            transform-origin: 11px 11px;
            animation: nova-pulse-${id} ${active ? '2s' : '3.6s'} ease-in-out infinite;
          }

          .nova-spark-tr-${id} {
            transform-origin: 18.5px 5.5px;
            animation: nova-sparkle-tr-${id} ${active ? '1.4s' : '2.2s'} ease-in-out infinite;
          }

          .nova-spark-bl-${id} {
            transform-origin: 4.5px 17.5px;
            animation: nova-sparkle-bl-${id} ${active ? '1.6s' : '2.6s'} ease-in-out infinite;
          }

          .nova-orbit-ring-${id} {
            transform-origin: 11px 11px;
            animation: nova-orbit-${id} ${active ? '5s' : '9s'} linear infinite;
          }
        `}</style>
      </defs>

      {/* Orbiting Faint Micro-Particles */}
      <g className={`nova-orbit-ring-${id}`} opacity={active ? 0.85 : 0.45}>
        <circle cx="11" cy="2" r="0.75" fill="#38bdf8" />
        <circle cx="20" cy="11" r="0.6" fill="#a855f7" />
        <circle cx="11" cy="20" r="0.7" fill="#22d3ee" />
        <circle cx="2" cy="11" r="0.55" fill="#818cf8" />
      </g>

      {/* Main 4-Point Nova Star */}
      <path
        className={`nova-star-main-${id}`}
        d="M11 2C11 6.8 15.2 11 20 11C15.2 11 11 15.2 11 20C11 15.2 6.8 11 2 11C6.8 11 11 6.8 11 2Z"
        fill={`url(#ai-grad-${id})`}
        filter={`url(#ai-bloom-${id})`}
      />

      {/* Center Radiant Core Gem */}
      <circle
        cx="11"
        cy="11"
        r="2.2"
        fill={`url(#ai-glow-${id})`}
        className={`nova-star-main-${id}`}
        opacity="0.95"
      />

      {/* Top-Right Sparkle Star */}
      <path
        className={`nova-spark-tr-${id}`}
        d="M18.5 2.5C18.5 4.1 19.9 5.5 21.5 5.5C19.9 5.5 18.5 6.9 18.5 8.5C18.5 6.9 17.1 5.5 15.5 5.5C17.1 5.5 18.5 4.1 18.5 2.5Z"
        fill="#38bdf8"
      />

      {/* Bottom-Left Micro Diamond Sparkle */}
      <path
        className={`nova-spark-bl-${id}`}
        d="M4.5 15.5L6 17.5L4.5 19.5L3 17.5Z"
        fill="#a855f7"
      />
    </svg>
  );
};
