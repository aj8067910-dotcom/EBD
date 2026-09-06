import { useEffect, useState } from 'react';
import { OptionButton } from '../../ui/index.js';
import { Confirmation } from './Confirmation.js';
import type { OptionConfig, StudentMomentProps } from './types.js';

interface PeerConfig {
  question: string;
  options: OptionConfig[];
}

const PHASE_LABEL: Record<string, string> = {
  OPEN: 'Vote',
  DISCUSS: 'Discuta com seu grupo',
  REOPEN: 'Vote novamente',
  REVEALED: 'Resultado',
  CLOSED: 'Encerrado',
};

export function PeerInstructionAnswer({
  moment,
  phase,
  teamColor,
  submit,
}: StudentMomentProps) {
  const config = moment.config as PeerConfig;
  const [selected, setSelected] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const votable = phase === 'OPEN' || phase === 'REOPEN';

  // Allow a fresh vote whenever a votable phase begins.
  useEffect(() => {
    if (votable) setSent(false);
  }, [phase, votable]);

  const send = async () => {
    if (!selected) return;
    const res = await submit({ type: 'PEER_INSTRUCTION', optionIds: [selected] });
    if (res.ok) setSent(true);
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-brand-soft px-3 py-1 text-sm font-semibold text-brand">
          {PHASE_LABEL[phase ?? ''] ?? 'Aguarde'}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-ink">{config.question}</h2>

      {phase === 'DISCUSS' ? (
        <div className="rounded-xl bg-accent-soft p-4 text-center">
          <p className="text-lg font-semibold text-ink">
            Discuta com seu grupo 💬
          </p>
          <p className="mt-1 text-muted">
            Convença seus colegas e prepare-se para votar novamente.
          </p>
        </div>
      ) : phase === 'REVEALED' || phase === 'CLOSED' ? (
        <div className="rounded-xl bg-brand-soft p-4 text-center text-ink">
          Veja o resultado na tela do professor.
        </div>
      ) : sent ? (
        <Confirmation canChange={votable} onChange={() => setSent(false)} />
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {config.options.map((opt, i) => (
              <OptionButton
                key={opt.id}
                index={i}
                text={opt.text}
                selected={selected === opt.id}
                teamColor={teamColor}
                disabled={!votable}
                onClick={() => setSelected(opt.id)}
              />
            ))}
          </div>
          <button
            type="button"
            className="min-h-[52px] rounded-xl bg-brand font-semibold text-white disabled:opacity-50"
            disabled={!votable || !selected}
            onClick={send}
          >
            {phase === 'REOPEN' ? 'Confirmar novo voto' : 'Votar'}
          </button>
        </>
      )}
    </section>
  );
}
