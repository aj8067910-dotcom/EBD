import { cn } from './cn.js';

interface ProgressDotsProps {
  total: number;
  current: number;
  label?: string;
}

/** Step indicator (e.g. quiz question 2 of 5, or Peer Instruction phases). */
export function ProgressDots({ total, current, label }: ProgressDotsProps) {
  return (
    <div
      className="flex items-center gap-1.5"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      aria-label={label ?? `Passo ${current + 1} de ${total}`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2.5 rounded-full transition-all',
            i === current ? 'w-6 bg-brand' : 'w-2.5 bg-line',
          )}
        />
      ))}
    </div>
  );
}
