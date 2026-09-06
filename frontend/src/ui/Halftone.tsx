import { cn } from './cn.js';

interface HalftoneProps {
  className?: string;
  color?: string;
  /** Corner the dots emanate from before dissolving toward the center. */
  from?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  opacity?: number;
}

const ORIGIN: Record<NonNullable<HalftoneProps['from']>, string> = {
  'top-right': '120% 120% at 100% 0%',
  'top-left': '120% 120% at 0% 0%',
  'bottom-right': '120% 120% at 100% 100%',
  'bottom-left': '120% 120% at 0% 100%',
};

/**
 * El Shaday halftone signature: monochrome circular dots that dissolve from a
 * corner toward the center. Decorative only — keep it away from small text.
 */
export function Halftone({
  className,
  color = 'var(--brand)',
  from = 'top-right',
  opacity = 0.16,
}: HalftoneProps) {
  const mask = `radial-gradient(${ORIGIN[from]}, #000 0%, transparent 62%)`;
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0', className)}
      style={{
        backgroundImage: `radial-gradient(${color} 1.7px, transparent 2px)`,
        backgroundSize: '12px 12px',
        WebkitMaskImage: mask,
        maskImage: mask,
        opacity,
      }}
    />
  );
}
