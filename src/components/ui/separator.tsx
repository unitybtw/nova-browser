import * as React from 'react';
import { cn } from './utils';

const Separator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="separator"
      className={cn('h-px w-full shrink-0 bg-slate-200/80 dark:bg-slate-700/70', className)}
      {...props}
    />
  ),
);
Separator.displayName = 'Separator';

export { Separator };
