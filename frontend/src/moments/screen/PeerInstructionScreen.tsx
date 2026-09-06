import type {
  ActiveMomentView,
  MomentPhase,
  PeerInstructionResults,
  TimerTick,
} from '@koinonia/shared';
import { Bars } from './Bars.js';
import { optionLabels } from './labels.js';
import { Timer } from '../../ui/index.js';

interface Props {
  moment: ActiveMomentView;
  phase: MomentPhase | null;
  results: PeerInstructionResults | null;
  answeredCount: number;
  timer: TimerTick | null;
}

export function PeerInstructionScreen({
  moment,
  phase,
  results,
  answeredCount,
  timer,
}: Props) {
  const config = moment.config as { question: string };
  const labels = optionLabels(moment);

  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-8">
      <h1 className="text-center text-5xl font-bold text-ink">{config.question}</h1>

      {phase === 'DISCUSS' ? (
        <div className="flex flex-col items-center gap-4">
          {timer && (
            <Timer remaining={timer.remaining} total={timer.total} size="lg" />
          )}
          <p className="text-4xl font-semibold text-accent">Convença seu colega 💬</p>
        </div>
      ) : phase === 'REVEALED' && results ? (
        <div className="flex w-full flex-col gap-6">
          <div className="grid grid-cols-2 gap-10">
            <div>
              <p className="mb-3 text-center text-2xl text-muted">
                Antes — {Math.round(results.accuracyBefore * 100)}%
              </p>
              <Bars
                tallies={results.before}
                labels={labels}
                total={results.totalBefore}
                correctIds={results.correctOptionIds}
              />
            </div>
            <div>
              <p className="mb-3 text-center text-2xl text-muted">
                Depois — {Math.round(results.accuracyAfter * 100)}%
              </p>
              <Bars
                tallies={results.after}
                labels={labels}
                total={results.totalAfter}
                correctIds={results.correctOptionIds}
              />
            </div>
          </div>
          <p className="text-center text-3xl font-bold text-ok">
            Ganho: {Math.round(results.gain * 100)} pontos percentuais
          </p>
        </div>
      ) : (
        // VOTE_1 / VOTE_2: show only the response count (avoid biasing).
        <div className="flex flex-col items-center gap-2">
          <span className="text-8xl font-bold text-brand">{answeredCount}</span>
          <p className="text-3xl text-muted">
            {phase === 'REOPEN' ? 'votando novamente…' : 'já votaram'}
          </p>
        </div>
      )}
    </div>
  );
}
