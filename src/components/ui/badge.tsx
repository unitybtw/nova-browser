import * as React from 'react';
import { cn } from './utils';

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'success' | 'accent';

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900',
  secondary: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
  outline: 'border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-300',
  success:
    'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
  accent: 'bg-accent/15 text-accent border border-accent/20',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide [&_svg]:size-3 [&_svg]:shrink-0',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
