import type { ActiveMomentView, TimerTick } from '@koinonia/shared';
import { Timer } from '../../ui/index.js';

export function TimerScreen({
  moment,
  timer,
}: {
  moment: ActiveMomentView;
  timer: TimerTick | null;
}) {
  const config = moment.config as { label?: string; seconds: number };
  return (
    <div className="flex flex-col items-center gap-6">
      <h1 className="text-4xl font-semibold text-muted">
        {config.label || 'Cronômetro'}
      </h1>
      {timer ? (
        <Timer remaining={timer.remaining} total={timer.total} size="lg" />
      ) : (
        <p className="text-3xl text-muted">Pronto para iniciar.</p>
      )}
    </div>
  );
}
