import { useState } from 'react';
import { Button } from '../ui/index.js';

const TOUR_KEY = 'koinonia_tour_done';

const STEPS = [
  {
    icon: '📚',
    title: 'Crie sua lição',
    body: 'Use “Nova lição” ou comece de um modelo pronto de aula de EBD.',
  },
  {
    icon: '🧩',
    title: 'Monte o roteiro',
    body: 'Adicione momentos (enquete, Peer Instruction, quiz…) e arraste para ordenar.',
  },
  {
    icon: '▶️',
    title: 'Inicie a aula',
    body: 'Gere um código de 6 caracteres. Os alunos entram pelo celular, sem cadastro.',
  },
  {
    icon: '📽️',
    title: 'Conduza e projete',
    body: 'No painel ao vivo você controla as fases e abre o Modo Projetor para a turma.',
  },
];

/** Lightweight 4-step onboarding shown once on the teacher's first visit. */
export function TeacherTour() {
  const [step, setStep] = useState(() => {
    try {
      return localStorage.getItem(TOUR_KEY) ? -1 : 0;
    } catch {
      return -1;
    }
  });

  if (step < 0) return null;

  const finish = () => {
    try {
      localStorage.setItem(TOUR_KEY, '1');
    } catch {
      // ignore
    }
    setStep(-1);
  };

  const current = STEPS[step]!;
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Boas-vindas ao painel"
    >
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center shadow-lift">
        <div className="text-5xl" aria-hidden>
          {current.icon}
        </div>
        <h2 className="mt-3 text-xl font-bold text-ink">{current.title}</h2>
        <p className="mt-2 text-muted">{current.body}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full ${i === step ? 'w-6 bg-brand' : 'w-2 bg-line'}`}
            />
          ))}
        </div>

        <div className="mt-5 flex justify-between">
          <Button variant="ghost" onClick={finish}>
            Pular
          </Button>
          <Button onClick={() => (isLast ? finish() : setStep(step + 1))}>
            {isLast ? 'Começar' : 'Próximo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
