import type { MomentType } from '@koinonia/shared';
import { oid } from '../moments/momentCatalog.js';

export interface MomentDraft {
  type: MomentType;
  title: string;
  points: number;
  isPreClass: boolean;
  config: Record<string, unknown>;
  correctOptionIds?: string[];
}

export interface LessonTemplate {
  id: string;
  name: string;
  description: string;
  build: () => MomentDraft[];
}

function quizQuestion(text: string) {
  const a = oid();
  const b = oid();
  return {
    id: oid('q'),
    text,
    options: [
      { id: a, text: 'Opção A' },
      { id: b, text: 'Opção B' },
    ],
    correctId: a,
    seconds: 20,
  };
}

export const LESSON_TEMPLATES: LessonTemplate[] = [
  {
    id: 'ebd-padrao',
    name: 'Aula padrão EBD (50 min)',
    description:
      'Revisão relâmpago → nuvem de abertura → exposição + Peer Instruction → destaque no texto → pergunta aberta em duplas → reflexão.',
    build: () => {
      const opts = [
        { id: oid(), text: '' },
        { id: oid(), text: '' },
        { id: oid(), text: '' },
      ];
      return [
        {
          type: 'QUIZ_TEAM',
          title: 'Revisão relâmpago',
          points: 100,
          isPreClass: false,
          config: {
            questions: [
              quizQuestion('Revisão 1'),
              quizQuestion('Revisão 2'),
              quizQuestion('Revisão 3'),
            ],
          },
        },
        {
          type: 'WORD_CLOUD',
          title: 'Abertura — uma palavra',
          points: 0,
          isPreClass: false,
          config: { prompt: 'Em uma palavra, o que é…?', maxWords: 1 },
        },
        {
          type: 'PEER_INSTRUCTION',
          title: 'Conceito-chave',
          points: 0,
          isPreClass: false,
          config: {
            question: 'Pergunta conceitual',
            options: opts,
            allowMultiple: false,
            discussSeconds: 150,
          },
          correctOptionIds: [opts[1]!.id],
        },
        {
          type: 'VERSE_HIGHLIGHT',
          title: 'O que mais te marcou?',
          points: 0,
          isPreClass: false,
          config: { reference: '', text: 'Cole aqui o texto bíblico.' },
        },
        {
          type: 'OPEN_QUESTION',
          title: 'Aplicação em duplas',
          points: 0,
          isPreClass: false,
          config: { prompt: 'Como aplicar isso?', anonymous: false, requireApproval: true },
        },
        {
          type: 'REFLECTION',
          title: 'Fechamento',
          points: 0,
          isPreClass: false,
          config: {
            prompt: 'Uma coisa que vou aplicar esta semana:',
            anonymous: false,
            requireApproval: false,
          },
        },
      ];
    },
  },
  {
    id: 'debate',
    name: 'Debate / estudo de caso',
    description:
      'Enquete de posicionamento → cronômetro de discussão → enquete novamente → pergunta aberta.',
    build: () => {
      const before = [
        { id: oid(), text: 'Concordo' },
        { id: oid(), text: 'Discordo' },
      ];
      const after = [
        { id: oid(), text: 'Concordo' },
        { id: oid(), text: 'Discordo' },
      ];
      return [
        {
          type: 'POLL',
          title: 'Posicionamento inicial',
          points: 0,
          isPreClass: false,
          config: { question: 'Qual sua posição?', options: before, allowMultiple: false },
        },
        {
          type: 'TIMER',
          title: 'Discussão',
          points: 0,
          isPreClass: false,
          config: { seconds: 300, label: 'Debate em grupo' },
        },
        {
          type: 'POLL',
          title: 'Posicionamento final',
          points: 0,
          isPreClass: false,
          config: { question: 'Mudou de ideia?', options: after, allowMultiple: false },
        },
        {
          type: 'OPEN_QUESTION',
          title: 'Justifique',
          points: 0,
          isPreClass: false,
          config: { prompt: 'Por quê?', anonymous: true, requireApproval: true },
        },
      ];
    },
  },
  {
    id: 'revisao-trimestre',
    name: 'Revisão de trimestre',
    description: 'Quiz por equipes com 10 questões → reflexão final.',
    build: () => [
      {
        type: 'QUIZ_TEAM',
        title: 'Quiz do trimestre',
        points: 100,
        isPreClass: false,
        config: {
          questions: Array.from({ length: 10 }, (_, i) => quizQuestion(`Questão ${i + 1}`)),
        },
      },
      {
        type: 'REFLECTION',
        title: 'Fechamento do trimestre',
        points: 0,
        isPreClass: false,
        config: { prompt: 'O que mais marcou você?', anonymous: false, requireApproval: false },
      },
    ],
  },
];
