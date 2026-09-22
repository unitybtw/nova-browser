import * as React from 'react';
import { cn } from './utils';

type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link';
type ButtonSize = 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm';

const variantClasses: Record<ButtonVariant, string> = {
  default:
    'bg-slate-900 text-slate-50 shadow hover:bg-slate-900/90 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50/90',
  secondary:
    'bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-100/80 dark:bg-slate-800 dark:text-slate-50 dark:hover:bg-slate-800/80',
  outline:
    'border border-slate-200 bg-white shadow-sm hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50',
  ghost: 'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-50',
  destructive:
    'bg-red-500 text-slate-50 shadow-sm hover:bg-red-500/90 dark:bg-red-900 dark:text-slate-50 dark:hover:bg-red-900/90',
  link: 'text-slate-900 underline-offset-4 hover:underline dark:text-slate-50',
};

const accentClasses: Partial<Record<ButtonVariant, string>> = {
  default:
    'bg-accent text-white shadow hover:bg-accent-hover dark:bg-accent dark:hover:bg-accent-hover',
};

const sizeClasses: Record<ButtonSize, string> = {
  default: 'h-9 px-4 py-2',
  sm: 'h-8 rounded-lg px-3 text-xs',
  lg: 'h-10 rounded-xl px-6',
  icon: 'h-9 w-9',
  'icon-sm': 'h-7 w-7',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Use the app accent color instead of the neutral default. */
  accent?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', accent = false, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] dark:focus-visible:ring-offset-slate-900 [&_svg]:size-4 [&_svg]:shrink-0',
        accent && variant === 'default' ? accentClasses.default : variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

export { Button };
