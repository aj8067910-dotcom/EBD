import { useMemo, useState } from 'react';
import { cn } from '../../ui/index.js';
import { Confirmation } from './Confirmation.js';
import type { StudentMomentProps } from './types.js';

interface VerseConfig {
  reference: string;
  text: string;
}

export function VerseHighlightAnswer({ moment, phase, submit }: StudentMomentProps) {
  const config = moment.config as VerseConfig;
  const words = useMemo(
    () => config.text.trim().split(/\s+/).filter(Boolean),
    [config.text],
  );
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sent, setSent] = useState(false);
  const open = phase === 'OPEN';

  const toggle = (i: number) => {
    if (!open) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const send = async () => {
    if (selected.size === 0) return;
    const res = await submit({
      type: 'VERSE_HIGHLIGHT',
      wordIndices: [...selected].sort((a, b) => a - b),
    });
    if (res.ok) setSent(true);
  };

  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-ink">
          Toque no trecho que mais te marcou
        </h2>
        <p className="text-sm text-muted">{config.reference}</p>
      </div>

      <p className="text-lg leading-relaxed">
        {words.map((word, i) => (
          <span key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              disabled={!open}
              className={cn(
                'rounded px-0.5',
                selected.has(i) ? 'bg-accent text-white' : 'hover:bg-accent-soft',
              )}
            >
              {word}
            </button>{' '}
          </span>
        ))}
      </p>

      {sent ? (
        <Confirmation canChange={open} onChange={() => setSent(false)} />
      ) : (
        <button
          type="button"
          className="min-h-[52px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
          disabled={!open || selected.size === 0}
          onClick={send}
        >
          Enviar seleção ({selected.size})
        </button>
      )}
    </section>
  );
}
