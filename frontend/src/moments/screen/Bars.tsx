import { motion } from 'framer-motion';
import type { OptionTally } from '@koinonia/shared';

interface BarsProps {
  tallies: OptionTally[];
  labels: Record<string, string>;
  total: number;
  correctIds?: string[];
}

/** Large animated horizontal bars for the projector (Poll / Peer Instruction). */
export function Bars({ tallies, labels, total, correctIds }: BarsProps) {
  const correct = new Set(correctIds ?? []);
  const max = Math.max(1, ...tallies.map((t) => t.count));
  return (
    <div className="flex w-full flex-col gap-4">
      {tallies.map((t) => {
        const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
        const isCorrect = correct.has(t.optionId);
        return (
          <div key={t.optionId} className="flex items-center gap-4">
            <span className="w-1/3 truncate text-2xl text-ink">
              {labels[t.optionId] ?? t.optionId}
            </span>
            <div className="relative h-14 flex-1 overflow-hidden rounded-xl bg-line/40">
              <motion.div
                className="h-full rounded-xl"
                style={{ backgroundColor: isCorrect ? 'var(--ok)' : 'var(--brand)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(t.count / max) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xl font-bold text-ink">
                {pct}% ({t.count})
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
