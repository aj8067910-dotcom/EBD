import { useMemo } from 'react';
import type {
  ActiveMomentView,
  VerseHighlightResults,
} from '@koinonia/shared';

export function VerseHighlightScreen({
  moment,
  results,
}: {
  moment: ActiveMomentView;
  results: VerseHighlightResults | null;
}) {
  const config = moment.config as { reference: string; text: string };
  const words = useMemo(
    () => config.text.trim().split(/\s+/).filter(Boolean),
    [config.text],
  );
  const heat = results?.heat ?? [];
  const max = Math.max(1, ...heat);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6">
      <p className="text-center text-2xl text-muted">{config.reference}</p>
      <p className="text-4xl leading-relaxed text-ink">
        {words.map((word, i) => {
          const intensity = (heat[i] ?? 0) / max;
          return (
            <span
              key={i}
              style={{
                backgroundColor:
                  intensity > 0 ? `rgba(201, 154, 63, ${0.15 + intensity * 0.85})` : 'transparent',
                borderRadius: 4,
                padding: '0 2px',
              }}
            >
              {word}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
}
