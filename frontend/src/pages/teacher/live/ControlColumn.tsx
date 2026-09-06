import type {
  ActiveMomentView,
  MomentPhase,
  MomentResults,
  OpenAnswerCard,
} from '@koinonia/shared';
import { Button } from '../../../ui/index.js';
import { ResultsPreview } from '../../../moments/results/ResultsPreview.js';
import { host, type RoomSocket } from '../../../realtime/socket.js';

interface Props {
  activeMoment: ActiveMomentView | null;
  phase: MomentPhase | null;
  answeredCount: number;
  participantCount: number;
  results: MomentResults | null;
  socket: RoomSocket;
}

/** Contextual label for the "advance phase" action by type + phase. */
function advanceLabel(type: string, phase: MomentPhase | null): string | null {
  if (type === 'PEER_INSTRUCTION') {
    if (phase === 'OPEN') return 'Iniciar discussão (2:30)';
    if (phase === 'DISCUSS') return 'Reabrir votação';
    if (phase === 'REOPEN') return 'Revelar resultado';
    return null;
  }
  if (type === 'QUIZ_TEAM') {
    return phase === 'REVEALED' ? null : 'Próxima pergunta / Revelar';
  }
  if (type === 'OPEN_QUESTION' || type === 'REFLECTION') {
    return phase === 'OPEN' ? 'Encerrar respostas' : null;
  }
  return phase === 'OPEN' ? 'Fechar' : phase === 'CLOSED' ? 'Revelar' : null;
}

export function ControlColumn({
  activeMoment,
  phase,
  answeredCount,
  participantCount,
  results,
  socket,
}: Props) {
  if (!activeMoment) {
    return (
      <div className="rounded-xl border border-dashed border-line p-8 text-center text-muted">
        Inicie um momento no roteiro à esquerda.
      </div>
    );
  }

  const label = advanceLabel(activeMoment.type, phase);
  const reexplain =
    results?.type === 'PEER_INSTRUCTION' && results.suggestion === 'REEXPLAIN';
  const isModerated =
    activeMoment.type === 'OPEN_QUESTION' || activeMoment.type === 'REFLECTION';
  const cards =
    results && (results.type === 'OPEN_QUESTION' || results.type === 'REFLECTION')
      ? results.cards
      : [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          {phase}
        </span>
        <h2 className="mt-2 text-xl font-semibold text-ink">{activeMoment.title}</h2>
        <p className="text-sm text-muted">
          {answeredCount}/{participantCount} responderam
        </p>
      </div>

      {reexplain && (
        <div
          className="rounded-xl bg-danger/10 p-3 text-sm font-medium text-danger"
          role="alert"
        >
          Menos de 30% acertaram — considere reexplicar antes da discussão.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {label && (
          <Button onClick={() => host.advancePhase(socket, activeMoment.id)}>
            {label}
          </Button>
        )}
        <Button variant="secondary" onClick={() => host.closeMoment(socket, activeMoment.id)}>
          Encerrar momento
        </Button>
      </div>

      <div className="rounded-xl border border-line p-3">
        <ResultsPreview results={results} moment={activeMoment} />
      </div>

      {isModerated && (
        <ModerationQueue cards={cards} socket={socket} />
      )}
    </div>
  );
}

function ModerationQueue({
  cards,
  socket,
}: {
  cards: OpenAnswerCard[];
  socket: RoomSocket;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-ink">Moderação</h3>
      {cards.length === 0 && <p className="text-sm text-muted">Sem respostas ainda.</p>}
      {cards.map((c) => (
        <div
          key={c.id}
          className="flex items-center gap-2 rounded-xl border border-line p-2"
        >
          <span className="min-w-0 flex-1 text-sm text-ink">
            {c.text}
            {c.authorNickname && (
              <span className="text-muted"> — {c.authorNickname}</span>
            )}
          </span>
          <Button
            variant={c.approved ? 'secondary' : 'primary'}
            onClick={() => host.approveAnswer(socket, c.id, !c.approved)}
          >
            {c.approved ? 'Ocultar' : 'Exibir'}
          </Button>
        </div>
      ))}
    </div>
  );
}
