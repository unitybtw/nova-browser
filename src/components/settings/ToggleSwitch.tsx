import React from 'react';

interface ToggleSwitchProps {
  /** Undefined is treated as off, matching the previous inline `cond ? on : off` behavior. */
  checked: boolean | undefined;
  onToggle: () => void;
  ariaLabel: string;
  /** Active (on-state) background color. Defaults to the most common variant. */
  activeColorClass?: string;
}

/**
 * Standard h-6 w-11 settings toggle.
 * Class names are copied verbatim from the pre-existing inline toggles
 * in SettingsPage so there is zero visual difference.
 */
export function ToggleSwitch({ checked, onToggle, ariaLabel, activeColorClass = 'bg-blue-500' }: ToggleSwitchProps) {
  const isChecked = Boolean(checked);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isChecked ? activeColorClass : 'bg-slate-300 dark:bg-slate-600'}`}
    >
      <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${isChecked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );
}
