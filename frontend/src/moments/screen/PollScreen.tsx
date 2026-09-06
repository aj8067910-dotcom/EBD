import type { ActiveMomentView, PollResults } from '@koinonia/shared';
import { Bars } from './Bars.js';
import { optionLabels } from './labels.js';

export function PollScreen({
  moment,
  results,
}: {
  moment: ActiveMomentView;
  results: PollResults | null;
}) {
  const config = moment.config as { question: string };
  return (
    <div className="flex w-full max-w-5xl flex-col gap-8">
      <h1 className="text-center text-5xl font-bold text-ink">{config.question}</h1>
      {results && results.tallies.length > 0 ? (
        <Bars
          tallies={results.tallies}
          labels={optionLabels(moment)}
          total={results.totalAnswers}
        />
      ) : (
        <p className="text-center text-3xl text-muted">Aguardando votos…</p>
      )}
    </div>
  );
}
