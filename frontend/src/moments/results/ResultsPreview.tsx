import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ActiveMomentView, MomentResults } from '@koinonia/shared';

interface Props {
  results: MomentResults | null;
  moment: ActiveMomentView | null;
}

interface Option {
  id: string;
  text: string;
}

function optionLabels(moment: ActiveMomentView | null): Record<string, string> {
  const config = (moment?.config ?? {}) as { options?: Option[] };
  const map: Record<string, string> = {};
  (config.options ?? []).forEach((o, i) => {
    map[o.id] = `${String.fromCharCode(65 + i)}. ${o.text}`;
  });
  return map;
}

function TallyChart({
  data,
  correct,
}: {
  data: { label: string; count: number; id: string }[];
  correct?: string[];
}) {
  const correctSet = new Set(correct ?? []);
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis type="category" dataKey="label" width={140} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="count" radius={[0, 6, 6, 0]}>
          {data.map((d) => (
            <Cell
              key={d.id}
              fill={correctSet.has(d.id) ? 'var(--ok)' : 'var(--brand)'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Aggregated results preview for the teacher control panel. */
export function ResultsPreview({ results, moment }: Props) {
  if (!results) {
    return <p className="text-sm text-muted">Sem respostas ainda.</p>;
  }
  const labels = optionLabels(moment);

  switch (results.type) {
    case 'POLL':
      return (
        <TallyChart
          data={results.tallies.map((t) => ({
            id: t.optionId,
            label: labels[t.optionId] ?? t.optionId,
            count: t.count,
          }))}
        />
      );

    case 'PEER_INSTRUCTION':
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-center text-sm font-medium text-muted">
                Antes ({Math.round(results.accuracyBefore * 100)}%)
              </p>
              <TallyChart
                data={results.before.map((t) => ({
                  id: t.optionId,
                  label: labels[t.optionId] ?? t.optionId,
                  count: t.count,
                }))}
                correct={results.correctOptionIds}
              />
            </div>
            <div>
              <p className="mb-1 text-center text-sm font-medium text-muted">
                Depois ({Math.round(results.accuracyAfter * 100)}%)
              </p>
              <TallyChart
                data={results.after.map((t) => ({
                  id: t.optionId,
                  label: labels[t.optionId] ?? t.optionId,
                  count: t.count,
                }))}
                correct={results.correctOptionIds}
              />
            </div>
          </div>
          <p className="text-center text-sm text-ink">
            Ganho: <strong>{Math.round(results.gain * 100)} pontos percentuais</strong>
          </p>
        </div>
      );

    case 'WORD_CLOUD':
      return (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {results.words.map((w) => (
            <span
              key={w.word}
              className="text-ink"
              style={{ fontSize: `${Math.min(2.5, 0.9 + w.count * 0.3)}rem` }}
            >
              {w.word}
            </span>
          ))}
          {results.words.length === 0 && (
            <span className="text-sm text-muted">Sem palavras ainda.</span>
          )}
        </div>
      );

    case 'QUIZ_TEAM':
      return (
        <ul className="flex flex-col gap-2">
          {results.scores.map((t, i) => (
            <li key={t.id} className="flex items-center gap-2">
              <span className="w-6 text-center font-bold">{i + 1}º</span>
              <span
                className="flex-1 rounded-lg px-3 py-2 font-semibold text-white"
                style={{ backgroundColor: t.color }}
              >
                {t.name}
              </span>
              <span className="font-bold tabular-nums">{t.score}</span>
            </li>
          ))}
        </ul>
      );

    case 'VERSE_HIGHLIGHT':
      return (
        <p className="text-sm text-muted">
          {results.totalAnswers} destaque(s) enviados. Veja o mapa de calor na tela.
        </p>
      );

    case 'OPEN_QUESTION':
    case 'REFLECTION':
      return (
        <p className="text-sm text-muted">
          {results.totalAnswers} resposta(s). Use a moderação para exibir.
        </p>
      );

    default:
      return null;
  }
}
