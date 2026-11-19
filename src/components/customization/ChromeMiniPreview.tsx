import React from 'react';
import type { ChromeMode, TabBarPosition } from '../../types/browser';

export interface ChromeMiniPreviewProps {
  mode: ChromeMode;
  tabBarPosition?: TabBarPosition;
  selected?: boolean;
  surfaceBg?: string;
  accentColor?: string;
  compact?: boolean;
}

/**
 * Architectural miniature wireframe showing the real browser shell geometry
 * (Classic Top above/below, Compact Single-Row, Vertical Left, Vertical Right).
 */
export const ChromeMiniPreview: React.FC<ChromeMiniPreviewProps> = ({
  mode,
  tabBarPosition = 'above-toolbar',
  selected = false,
  surfaceBg,
  accentColor,
  compact = false,
}) => {
  const heightCls = compact ? 'h-11' : 'h-12';
  const frameStyle = surfaceBg ? { backgroundColor: surfaceBg } : undefined;
  const accentStyle = accentColor ? { backgroundColor: accentColor } : undefined;

  const activePillCls = accentColor
    ? ''
    : selected
    ? 'bg-neutral-900 dark:bg-white'
    : 'bg-neutral-400 dark:bg-neutral-500';
  const chromeBarCls = surfaceBg
    ? 'bg-white/[0.10]'
    : 'bg-neutral-200/90 dark:bg-white/[0.08]';
  const contentCanvasCls = surfaceBg
    ? 'bg-white/[0.05] border border-white/[0.07]'
    : 'bg-white dark:bg-[#111214] border border-neutral-200/80 dark:border-white/[0.06]';

  if (mode === 'compact-single-row') {
    return (
      <div
        style={frameStyle}
        className={`w-full ${heightCls} rounded-md ${
          surfaceBg ? 'border border-white/10' : 'bg-neutral-100 dark:bg-[#191b1f] border border-neutral-200/90 dark:border-white/[0.08]'
        } p-1.5 flex flex-col gap-1 overflow-hidden`}
      >
        <div className={`h-2.5 w-full rounded-[3px] ${chromeBarCls} px-1 flex items-center gap-1`}>
          <span style={accentStyle} className={`w-4 h-1.5 rounded-[2px] ${activePillCls}`} />
          <span className="w-3 h-1.5 rounded-[2px] bg-current opacity-20" />
          <span className="flex-1 h-1.5 rounded-[2px] bg-current opacity-15 ml-1" />
        </div>
        <div className={`flex-1 rounded-[3px] ${contentCanvasCls}`} />
      </div>
    );
  }

  if (mode === 'vertical-left' || mode === 'vertical-right') {
    const sidebar = (
      <div className={`w-6 h-full rounded-[3px] ${chromeBarCls} p-1 flex flex-col gap-1 shrink-0`}>
        <span style={accentStyle} className={`w-full h-1.5 rounded-[2px] ${activePillCls}`} />
        <span className="w-4/5 h-1 rounded-[1px] bg-current opacity-25" />
        <span className="w-3/4 h-1 rounded-[1px] bg-current opacity-20" />
      </div>
    );
    const main = (
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div className={`h-2 w-full rounded-[3px] ${chromeBarCls} px-1 flex items-center`}>
          <span className="w-1/2 h-1 rounded-[1px] bg-current opacity-20" />
        </div>
        <div className={`flex-1 rounded-[3px] ${contentCanvasCls}`} />
      </div>
    );
    return (
      <div
        style={frameStyle}
        className={`w-full ${heightCls} rounded-md ${
          surfaceBg ? 'border border-white/10' : 'bg-neutral-100 dark:bg-[#191b1f] border border-neutral-200/90 dark:border-white/[0.08]'
        } p-1.5 flex gap-1.5 overflow-hidden`}
      >
        {mode === 'vertical-left' ? (
          <>
            {sidebar}
            {main}
          </>
        ) : (
          <>
            {main}
            {sidebar}
          </>
        )}
      </div>
    );
  }

  // classic-top (above-toolbar or below-toolbar)
  const tabRow = (
    <div className="h-2 w-full flex items-center gap-1 px-0.5">
      <span style={accentStyle} className={`w-5 h-1.5 rounded-[2px] ${activePillCls}`} />
      <span className="w-4 h-1.5 rounded-[2px] bg-current opacity-20" />
      <span className="w-4 h-1.5 rounded-[2px] bg-current opacity-15" />
    </div>
  );
  const addressRow = (
    <div className={`h-2 w-full rounded-[3px] ${chromeBarCls} px-1 flex items-center`}>
      <span className="w-2/3 h-1 rounded-[1px] bg-current opacity-20" />
    </div>
  );

  return (
    <div
      style={frameStyle}
      className={`w-full ${heightCls} rounded-md ${
        surfaceBg ? 'border border-white/10' : 'bg-neutral-100 dark:bg-[#191b1f] border border-neutral-200/90 dark:border-white/[0.08]'
      } p-1.5 flex flex-col gap-1 overflow-hidden`}
    >
      {tabBarPosition === 'below-toolbar' ? (
        <>
          {addressRow}
          {tabRow}
        </>
      ) : (
        <>
          {tabRow}
          {addressRow}
        </>
      )}
      <div className={`flex-1 rounded-[3px] ${contentCanvasCls}`} />
    </div>
  );
};
