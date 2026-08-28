import React from 'react';

export type WindowPlatform = 'mac' | 'windows';

interface WindowControlsProps {
  platform: WindowPlatform;
  className?: string;
}

/** Decorative controls used only in embedded website demos. */
export const WindowControls: React.FC<WindowControlsProps> = ({ platform, className = '' }) => (
  <span className={`pointer-events-none flex shrink-0 select-none items-center ${className}`} aria-hidden="true">
    {platform === 'mac' ? (
      <div className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.16)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.16)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.16)]" />
      </div>
    ) : (
      <div className="flex h-5 items-center gap-0.5 text-[11px] leading-none text-slate-500 dark:text-slate-400">
        <span className="flex h-5 w-5 items-center justify-center">−</span>
        <span className="flex h-5 w-5 items-center justify-center text-[10px]">□</span>
        <span className="flex h-5 w-5 items-center justify-center text-[13px]">×</span>
      </div>
    )}
  </span>
);

export default WindowControls;
