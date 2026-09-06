import { cn } from './cn.js';

export type OptionState = 'idle' | 'correct' | 'incorrect';

interface OptionButtonProps {
  index: number;
  text: string;
  selected?: boolean;
  state?: OptionState;
  /** Team color used as an accent (left bar) when the student has a team. */
  teamColor?: string | null;
  disabled?: boolean;
  onClick?: () => void;
}

const LETTERS = 'ABCDEFGH';

export function OptionButton({
  index,
  text,
  selected = false,
  state = 'idle',
  teamColor,
  disabled = false,
  onClick,
}: OptionButtonProps) {
  const letter = LETTERS[index] ?? String(index + 1);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[56px] w-full items-center gap-3 rounded-xl border p-3 text-left text-lg transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-70',
        state === 'correct' && 'border-ok bg-ok/10',
        state === 'incorrect' && 'border-danger bg-danger/10',
        state === 'idle' && selected && 'border-brand bg-brand-soft',
        state === 'idle' && !selected && 'border-line bg-surface hover:border-brand',
      )}
      style={
        teamColor
          ? { boxShadow: `inset 4px 0 0 0 ${teamColor}` }
          : undefined
      }
    >
      <span
        aria-hidden
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-bold',
          selected || state !== 'idle'
            ? 'bg-brand text-white'
            : 'bg-brand-soft text-brand',
        )}
      >
        {letter}
      </span>
      <span className="flex-1 text-ink">{text}</span>
      {state === 'correct' && <span aria-label="correta">✓</span>}
      {state === 'incorrect' && <span aria-label="incorreta">✕</span>}
    </button>
  );
}
