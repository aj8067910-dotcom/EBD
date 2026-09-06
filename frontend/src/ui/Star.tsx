import { cn } from './cn.js';

/** El Shaday four-pointed star — list marker, divider, seal or decoration. */
export function Star({
  size = 24,
  className,
  color = 'currentColor',
}: {
  size?: number;
  className?: string;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      aria-hidden
      fill={color}
    >
      <path d="M50 0 C54 34 66 46 100 50 C66 54 54 66 50 100 C46 66 34 54 0 50 C34 46 46 34 50 0 Z" />
    </svg>
  );
}

/** A small odd-numbered cluster of stars (suggests light and movement). */
export function StarCluster({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-accent', className)}>
      <Star size={14} />
      <Star size={24} />
      <Star size={12} />
    </span>
  );
}
