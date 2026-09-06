import { useState } from 'react';
import { OptionButton } from '../../ui/index.js';
import { Confirmation } from './Confirmation.js';
import type { OptionConfig, StudentMomentProps } from './types.js';

interface PollConfig {
  question: string;
  options: OptionConfig[];
  allowMultiple?: boolean;
}

export function PollAnswer({ moment, phase, teamColor, submit }: StudentMomentProps) {
  const config = moment.config as PollConfig;
  const [selected, setSelected] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const open = phase === 'OPEN';

  const toggle = (id: string) => {
    if (config.allowMultiple) {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelected([id]);
    }
  };

  const send = async () => {
    if (selected.length === 0) return;
    const res = await submit({ type: 'POLL', optionIds: selected });
    if (res.ok) setSent(true);
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-ink">{config.question}</h2>
      {sent ? (
        <Confirmation canChange={open} onChange={() => setSent(false)} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {config.options.map((opt, i) => (
              <OptionButton
                key={opt.id}
                index={i}
                text={opt.text}
                selected={selected.includes(opt.id)}
                teamColor={teamColor}
                disabled={!open}
                onClick={() => toggle(opt.id)}
              />
            ))}
          </div>
          <button
            type="button"
            className="min-h-[52px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
            disabled={!open || selected.length === 0}
            onClick={send}
          >
            {open ? 'Enviar resposta' : 'Votação encerrada'}
          </button>
        </>
      )}
    </section>
  );
}
