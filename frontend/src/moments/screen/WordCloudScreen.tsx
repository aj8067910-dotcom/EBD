import { motion } from 'framer-motion';
import type { ActiveMomentView, WordCloudResults } from '@koinonia/shared';

const COLORS = ['var(--brand)', 'var(--accent)', 'var(--ok)', 'var(--brand-strong)'];

export function WordCloudScreen({
  moment,
  results,
}: {
  moment: ActiveMomentView;
  results: WordCloudResults | null;
}) {
  const config = moment.config as { prompt: string };
  const max = Math.max(1, ...(results?.words ?? []).map((w) => w.count));

  return (
    <div className="flex w-full max-w-6xl flex-col items-center gap-10">
      <h1 className="text-center text-4xl font-bold text-ink">{config.prompt}</h1>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {(results?.words ?? []).map((w, i) => (
          <motion.span
            key={w.word}
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            style={{
              fontSize: `${1.5 + (w.count / max) * 4}rem`,
              color: COLORS[i % COLORS.length],
              fontWeight: 700,
            }}
          >
            {w.word}
          </motion.span>
        ))}
        {(!results || results.words.length === 0) && (
          <p className="text-3xl text-muted">Aguardando palavras…</p>
        )}
      </div>
    </div>
  );
}
