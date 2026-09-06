import { cn } from './cn.js';

interface TimerProps {
  remaining: number;
  total: number;
  label?: string;
  size?: 'sm' | 'lg';
}

function format(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Countdown display with a progress ring. */
export function Timer({ remaining, total, label, size = 'sm' }: TimerProps) {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const dim = size === 'lg' ? 140 : 64;
  const stroke = size === 'lg' ? 10 : 6;
  const r = (dim - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const low = remaining <= 10;

  return (
    <div className="flex flex-col items-center gap-1" aria-live="polite">
      <div className="relative" style={{ width: dim, height: dim }}>
        <svg width={dim} height={dim} className="-rotate-90">
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke="var(--line)"
            strokeWidth={stroke}
          />
          <circle
            cx={dim / 2}
            cy={dim / 2}
            r={r}
            fill="none"
            stroke={low ? 'var(--danger)' : 'var(--brand)'}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center font-bold tabular-nums',
            size === 'lg' ? 'text-3xl' : 'text-base',
            low ? 'text-danger' : 'text-ink',
          )}
        >
          {format(remaining)}
        </span>
      </div>
      {label && <span className="text-sm text-muted">{label}</span>}
    </div>
  );
}
