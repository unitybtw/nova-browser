import React from 'react';

export interface SmoothCollapseProps {
  /** Whether the collapsible container is expanded or collapsed. */
  isOpen: boolean;
  /** Content to display inside the smoothly expanding/collapsing container. */
  children: React.ReactNode;
  /** Optional class name applied to the outer grid container. */
  className?: string;
  /** Optional class name applied to the inner overflow-hidden container. */
  innerClassName?: string;
}

/**
 * Modern GPU-accelerated smooth collapsible container utilizing CSS Grid
 * `grid-template-rows: 0fr -> 1fr` with coordinated fade and subtle slide.
 * Requires zero JavaScript height measurement and causes zero layout jank.
 */
export function SmoothCollapse({
  isOpen,
  children,
  className = '',
  innerClassName = ''
}: SmoothCollapseProps) {
  return (
    <div
      aria-hidden={!isOpen}
      className={`grid transition-[grid-template-rows] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
        isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
      } ${className}`}
    >
      <div
        className={`overflow-hidden min-h-0 transition-all duration-200 ease-out motion-reduce:transition-none ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'
        } ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
