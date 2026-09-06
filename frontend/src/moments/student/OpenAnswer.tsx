import { useState } from 'react';
import { Confirmation } from './Confirmation.js';
import type { StudentMomentProps } from './types.js';

interface OpenConfig {
  prompt: string;
  anonymous?: boolean;
}

/** Shared free-text answer for OPEN_QUESTION and REFLECTION moments. */
export function OpenAnswer({ moment, phase, submit }: StudentMomentProps) {
  const config = moment.config as OpenConfig;
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const open = phase === 'OPEN';

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const type = moment.type === 'REFLECTION' ? 'REFLECTION' : 'OPEN_QUESTION';
    const res = await submit({ type, text: trimmed });
    if (res.ok) setSent(true);
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-ink">{config.prompt}</h2>
      {config.anonymous === false && (
        <p className="text-sm text-muted">Sua resposta aparecerá com seu apelido.</p>
      )}
      {sent ? (
        <Confirmation canChange={open} onChange={() => setSent(false)} />
      ) : (
        <>
          <textarea
            value={text}
            maxLength={280}
            rows={4}
            disabled={!open}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escreva sua resposta…"
            className="rounded-xl border border-line bg-surface p-3 text-lg text-ink placeholder:text-muted disabled:opacity-60"
            aria-label={config.prompt}
          />
          <div className="flex items-center justify-between text-sm text-muted">
            <span>{text.length}/280</span>
          </div>
          <button
            type="button"
            className="min-h-[52px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
            disabled={!open || !text.trim()}
            onClick={send}
          >
            {open ? 'Enviar' : 'Encerrado'}
          </button>
        </>
      )}
    </section>
  );
}
