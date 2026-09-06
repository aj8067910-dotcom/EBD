import { useEffect, useState } from 'react';
import { OptionButton, ProgressDots } from '../../ui/index.js';
import type { OptionConfig, StudentMomentProps } from './types.js';

interface QuizPublicConfig {
  questionIndex: number;
  questionCount: number;
  question: { id: string; text: string; options: OptionConfig[] } | null;
}

export function QuizAnswer({ moment, phase, teamColor, submit }: StudentMomentProps) {
  const config = moment.config as QuizPublicConfig;
  const question = config.question;
  const [chosen, setChosen] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<null | boolean>(null);
  const open = phase === 'OPEN';

  // Reset when the question changes.
  useEffect(() => {
    setChosen(null);
    setFeedback(null);
  }, [config.questionIndex]);

  const pick = async (optionId: string) => {
    if (!open || chosen || !question) return;
    setChosen(optionId);
    const res = await submit({
      type: 'QUIZ_TEAM',
      questionId: question.id,
      optionId,
    });
    if (res.ok) setFeedback(res.isCorrect ?? null);
  };

  if (phase === 'REVEALED' || !question) {
    return (
      <section className="flex flex-col items-center gap-3 py-6 text-center">
        <h2 className="text-xl font-semibold text-ink">Quiz encerrado!</h2>
        <p className="text-muted">Veja o placar das equipes na tela.</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <ProgressDots
          total={config.questionCount}
          current={config.questionIndex}
          label={`Pergunta ${config.questionIndex + 1} de ${config.questionCount}`}
        />
        <span className="text-sm text-muted">
          {config.questionIndex + 1}/{config.questionCount}
        </span>
      </div>
      <h2 className="text-xl font-semibold text-ink">{question.text}</h2>

      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <OptionButton
            key={opt.id}
            index={i}
            text={opt.text}
            selected={chosen === opt.id}
            state={
              chosen === opt.id && feedback !== null
                ? feedback
                  ? 'correct'
                  : 'incorrect'
                : 'idle'
            }
            teamColor={teamColor}
            disabled={!open || chosen !== null}
            onClick={() => pick(opt.id)}
          />
        ))}
      </div>

      {feedback !== null && (
        <div
          className={
            feedback
              ? 'rounded-xl bg-ok/10 px-4 py-3 font-semibold text-ok'
              : 'rounded-xl bg-danger/10 px-4 py-3 font-semibold text-danger'
          }
          role="status"
          aria-live="polite"
        >
          {feedback ? 'Você acertou! 🎉' : 'Resposta incorreta.'}
        </div>
      )}
    </section>
  );
}
