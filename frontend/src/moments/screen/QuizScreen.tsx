import { motion } from 'framer-motion';
import type {
  ActiveMomentView,
  MomentPhase,
  QuizTeamResults,
  TimerTick,
} from '@koinonia/shared';
import { Timer } from '../../ui/index.js';

interface Props {
  moment: ActiveMomentView;
  phase: MomentPhase | null;
  results: QuizTeamResults | null;
  answeredCount: number;
  timer: TimerTick | null;
}

interface QuizConfig {
  questionIndex: number;
  questionCount: number;
  question: { id: string; text: string; options: { id: string; text: string }[] } | null;
}

const PODIUM = ['🥇', '🥈', '🥉'];

export function QuizScreen({ moment, phase, results, answeredCount, timer }: Props) {
  const config = moment.config as QuizConfig;

  if (phase === 'REVEALED' && results) {
    return (
      <div className="flex w-full max-w-4xl flex-col items-center gap-6">
        <h1 className="text-5xl font-bold text-ink">Placar final 🏆</h1>
        <ul className="flex w-full flex-col gap-3">
          {results.scores.map((t, i) => (
            <motion.li
              key={t.id}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15 }}
              className="flex items-center gap-4 rounded-2xl px-6 py-4 text-3xl font-bold text-white"
              style={{ backgroundColor: t.color }}
            >
              <span>{PODIUM[i] ?? `${i + 1}º`}</span>
              <span className="flex-1">{t.name}</span>
              <span className="tabular-nums">{t.score}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    );
  }

  const q = config.question;
  return (
    <div className="flex w-full max-w-5xl flex-col items-center gap-8">
      <div className="flex w-full items-center justify-between">
        <span className="text-2xl text-muted">
          Pergunta {config.questionIndex + 1}/{config.questionCount}
        </span>
        {timer && <Timer remaining={timer.remaining} total={timer.total} />}
      </div>
      <h1 className="text-center text-5xl font-bold text-ink">{q?.text}</h1>
      <div className="grid w-full grid-cols-2 gap-4">
        {(q?.options ?? []).map((opt, i) => (
          <div
            key={opt.id}
            className="flex items-center gap-3 rounded-xl border border-line p-5 text-3xl text-ink"
          >
            <span className="font-bold text-brand">{String.fromCharCode(65 + i)}</span>
            {opt.text}
          </div>
        ))}
      </div>
      <p className="text-2xl text-muted">{answeredCount} responderam</p>
    </div>
  );
}
