import React from 'react';

interface ToggleSwitchProps {
  /** Undefined is treated as off. */
  checked: boolean | undefined;
  onToggle: () => void;
  ariaLabel: string;
  /** Optional active-state background override. Defaults to crisp monochrome Native macOS/Linear style. */
  activeColorClass?: string;
  disabled?: boolean;
  ariaBusy?: boolean;
  title?: string;
}

export function ToggleSwitch({
  checked,
  onToggle,
  ariaLabel,
  activeColorClass,
  disabled = false,
  ariaBusy,
  title,
}: ToggleSwitchProps) {
  const isChecked = Boolean(checked);
  const useCustomColor = Boolean(activeColorClass);
  const trackOnClass = activeColorClass || 'bg-neutral-900 dark:bg-white';
  const thumbOnClass = useCustomColor ? 'bg-white' : 'bg-white dark:bg-neutral-950';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      aria-label={ariaLabel}
      aria-busy={ariaBusy}
      disabled={disabled}
      title={title}
      onClick={onToggle}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 dark:focus-visible:ring-white/40 ${
        isChecked ? trackOnClass : 'bg-neutral-200 dark:bg-white/[0.14]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full shadow-xs transition-transform duration-150 ${
          isChecked ? `translate-x-[18px] ${thumbOnClass}` : 'translate-x-[3px] bg-white dark:bg-neutral-200'
        }`}
      />
    </button>
  );
}
