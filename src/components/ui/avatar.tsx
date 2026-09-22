import * as React from 'react';
import { cn } from './utils';

const Avatar = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full', className)}
      {...props}
    />
  ),
);
Avatar.displayName = 'Avatar';

const AvatarFallback = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center rounded-full bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 dark:text-cyan-400 [&_svg]:size-3.5',
        className,
      )}
      {...props}
    />
  ),
);
AvatarFallback.displayName = 'AvatarFallback';

export { Avatar, AvatarFallback };
