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
      className={`shrink-0 transition-transform duration-300 ${active ? 'scale-105' : ''} ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Clean, stable gradient without CPU-draining infinite SVG animations */}
        <linearGradient id={`ai-grad-${id}`} x1="15%" y1="15%" x2="85%" y2="85%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        <radialGradient id={`ai-glow-${id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#06b6d4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Main 4-Point Nova Star / Prism */}
      <path
        d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z"
        fill={`url(#ai-grad-${id})`}
        className="transition-opacity duration-300"
        opacity={active ? 1 : 0.85}
      />

      {/* Center Radiant Core */}
      <circle
        cx="12"
        cy="12"
        r="2"
        fill={`url(#ai-glow-${id})`}
        className="transition-opacity duration-300"
        opacity={active ? 1 : 0.75}
      />
    </svg>
  );
};
