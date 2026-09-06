import type { HTMLAttributes } from 'react';
import { cn } from './cn.js';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
}

/** Small pill label; `color` fills it (e.g. a team color). */
export function Badge({ color, className, style, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold',
        !color && 'bg-brand-soft text-brand',
        className,
      )}
      style={color ? { backgroundColor: color, color: '#fff', ...style } : style}
      {...rest}
    >
      {children}
    </span>
  );
}
