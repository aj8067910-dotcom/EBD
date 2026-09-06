import { useState } from 'react';
import { Input } from '../../ui/index.js';
import { Confirmation } from './Confirmation.js';
import type { StudentMomentProps } from './types.js';

interface WordCloudConfig {
  prompt: string;
}

export function WordCloudAnswer({ moment, phase, submit }: StudentMomentProps) {
  const config = moment.config as WordCloudConfig;
  const [word, setWord] = useState('');
  const [sent, setSent] = useState(false);
  const open = phase === 'OPEN';

  const send = async () => {
    const single = word.trim().split(/\s+/)[0] ?? '';
    if (!single) return;
    const res = await submit({ type: 'WORD_CLOUD', word: single });
    if (res.ok) setSent(true);
  };

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold text-ink">{config.prompt}</h2>
      {sent ? (
        <Confirmation canChange={open} onChange={() => setSent(false)} />
      ) : (
        <>
          <Input
            name="word"
            label="Uma palavra"
            value={word}
            maxLength={40}
            disabled={!open}
            onChange={(e) => setWord(e.target.value)}
            placeholder="Ex.: perdão"
          />
          <button
            type="button"
            className="min-h-[52px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
            disabled={!open || !word.trim()}
            onClick={send}
          >
            Enviar palavra
          </button>
        </>
      )}
    </section>
  );
}
