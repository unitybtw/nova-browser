import React from 'react';

export const SETTINGS_INPUT_CLS =
  'w-full px-3 py-1.5 rounded-lg bg-neutral-100/90 dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] text-xs text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30 transition-colors';

export const SETTINGS_SELECT_CLS =
  'px-2.5 py-1.5 rounded-lg bg-neutral-100/90 dark:bg-white/[0.06] border border-neutral-200/90 dark:border-white/[0.09] text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-400 dark:focus:border-white/30 transition-colors cursor-pointer';

export interface SettingsPageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const SettingsPageHeader: React.FC<SettingsPageHeaderProps> = ({
  title,
  description,
  action,
}) => (
  <header className="pb-5 border-b border-neutral-200/90 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
    <div className="space-y-1 min-w-0">
      <h1 className="text-xl font-semibold tracking-[-0.02em] text-neutral-950 dark:text-neutral-100">
        {title}
      </h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-xl">
        {description}
      </p>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </header>
);

export interface SettingsGroupProps {
  title?: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noDivide?: boolean;
}

export const SettingsGroup: React.FC<SettingsGroupProps> = ({
  title,
  description,
  right,
  children,
  className = '',
  noDivide = false,
}) => (
  <section className={`space-y-2.5 ${className}`}>
    {(title || right) && (
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0">
          {title && (
            <h2 className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 tracking-[-0.005em]">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
    )}
    <div
      className={`rounded-xl bg-white dark:bg-[#141518] border border-neutral-200/90 dark:border-white/[0.08] overflow-hidden ${
        noDivide ? '' : 'divide-y divide-neutral-200/80 dark:divide-white/[0.07]'
      }`}
    >
      {children}
    </div>
  </section>
);

export interface SettingsRowProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  vertical?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  title,
  description,
  badge,
  icon,
  children,
  className = '',
  vertical = false,
}) => (
  <div
    className={`px-4 sm:px-5 py-3.5 ${
      vertical
        ? 'flex flex-col gap-3'
        : 'flex flex-col sm:flex-row sm:items-center justify-between gap-3'
    } ${className}`}
  >
    <div className="flex items-start gap-3 min-w-0">
      {icon && (
        <div className="mt-0.5 text-neutral-500 dark:text-neutral-400 shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0 space-y-0.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[13px] font-medium text-neutral-900 dark:text-neutral-100 leading-snug">
            {title}
          </span>
          {badge}
        </div>
        {description && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {description}
          </div>
        )}
      </div>
    </div>
    {children && (
      <div className={vertical ? 'w-full' : 'shrink-0 flex items-center gap-2'}>
        {children}
      </div>
    )}
  </div>
);

export interface SettingsSegmentOption<T extends string> {
  id: T;
  label: string;
}

export function SettingsSegment<T extends string>({
  options,
  value,
  onChange,
  fullWidth = false,
}: {
  options: readonly SettingsSegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  fullWidth?: boolean;
}) {
  return (
    <div
      className={`inline-flex rounded-lg bg-neutral-100 dark:bg-white/[0.06] p-0.5 border border-neutral-200/80 dark:border-white/[0.07] ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`${fullWidth ? 'flex-1' : ''} px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-white/[0.14] text-neutral-950 dark:text-white shadow-xs'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export interface SettingsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const SettingsButton: React.FC<SettingsButtonProps> = ({
  variant = 'secondary',
  size = 'sm',
  className = '',
  disabled,
  ...rest
}) => {
  const sizeCls = size === 'md' ? 'px-4 py-2 text-xs' : 'px-3 py-1.5 text-xs';
  const variantCls =
    variant === 'primary'
      ? 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-200 dark:text-neutral-950 font-medium'
      : variant === 'danger'
      ? 'bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/20 font-medium'
      : variant === 'ghost'
      ? 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-white/[0.07] font-medium'
      : 'bg-neutral-100 hover:bg-neutral-200/80 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-neutral-800 dark:text-neutral-200 border border-neutral-200/80 dark:border-white/[0.08] font-medium';

  return (
    <button
      type="button"
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.98] whitespace-nowrap ${sizeCls} ${variantCls} ${className}`}
      {...rest}
    />
  );
};

export const SettingsBadge: React.FC<{
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}> = ({ tone = 'neutral', children, className = '' }) => {
  const toneCls =
    tone === 'success'
      ? 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
      : tone === 'warning'
      ? 'bg-amber-500/12 text-amber-700 dark:text-amber-300 border-amber-500/20'
      : tone === 'danger'
      ? 'bg-red-500/12 text-red-700 dark:text-red-300 border-red-500/20'
      : 'bg-neutral-100 dark:bg-white/[0.07] text-neutral-600 dark:text-neutral-300 border-neutral-200/80 dark:border-white/[0.08]';

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${toneCls} ${className}`}
    >
      {children}
    </span>
  );
};
