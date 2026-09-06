import { AnimatePresence, motion } from 'framer-motion';
import type {
  ActiveMomentView,
  OpenQuestionResults,
} from '@koinonia/shared';

/** Grid of approved answer cards (OPEN_QUESTION / REFLECTION). */
export function OpenQuestionScreen({
  moment,
  results,
}: {
  moment: ActiveMomentView;
  results: OpenQuestionResults | null;
}) {
  const config = moment.config as { prompt: string };
  const cards = results?.cards ?? [];

  return (
    <div className="flex w-full max-w-6xl flex-col gap-8">
      <h1 className="text-center text-4xl font-bold text-ink">{config.prompt}</h1>
      {cards.length === 0 ? (
        <p className="text-center text-3xl text-muted">
          Aguardando respostas aprovadas…
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {cards.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl border border-line bg-surface p-5"
              >
                <p className="text-2xl text-ink">{c.text}</p>
                <p className="mt-2 text-lg text-muted">
                  — {c.authorNickname ?? 'Anônimo'}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
