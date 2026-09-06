import type { MomentType } from '@koinonia/shared';

let counter = 0;
/** Short unique id for options/questions in the editor. */
export function oid(prefix = 'o'): string {
  counter += 1;
  return `${prefix}${Date.now().toString(36)}${counter}`;
}

export interface MomentCatalogEntry {
  type: MomentType;
  icon: string;
  name: string;
  /** One sentence: when to use it. */
  whenToUse: string;
  defaultTitle: string;
  defaultConfig: () => Record<string, unknown>;
  defaultPoints: number;
}

export const MOMENT_CATALOG: MomentCatalogEntry[] = [
  {
    type: 'POLL',
    icon: '📊',
    name: 'Enquete',
    whenToUse: 'Para sondar opiniões sem resposta certa.',
    defaultTitle: 'Enquete',
    defaultPoints: 0,
    defaultConfig: () => ({
      question: '',
      options: [
        { id: oid(), text: '' },
        { id: oid(), text: '' },
      ],
      allowMultiple: false,
    }),
  },
  {
    type: 'PEER_INSTRUCTION',
    icon: '🧠',
    name: 'Peer Instruction',
    whenToUse: 'Para conceitos onde os alunos costumam se enganar.',
    defaultTitle: 'Peer Instruction',
    defaultPoints: 0,
    defaultConfig: () => ({
      question: '',
      options: [
        { id: oid(), text: '' },
        { id: oid(), text: '' },
        { id: oid(), text: '' },
      ],
      allowMultiple: false,
      discussSeconds: 150,
    }),
  },
  {
    type: 'OPEN_QUESTION',
    icon: '💭',
    name: 'Pergunta aberta',
    whenToUse: 'Think-Pair-Share: aplicação e reflexão em duplas.',
    defaultTitle: 'Pergunta aberta',
    defaultPoints: 0,
    defaultConfig: () => ({ prompt: '', anonymous: true, requireApproval: true }),
  },
  {
    type: 'WORD_CLOUD',
    icon: '☁️',
    name: 'Nuvem de palavras',
    whenToUse: 'Uma palavra por aluno para abrir um tema.',
    defaultTitle: 'Nuvem de palavras',
    defaultPoints: 0,
    defaultConfig: () => ({ prompt: '', maxWords: 1 }),
  },
  {
    type: 'QUIZ_TEAM',
    icon: '🏆',
    name: 'Quiz por equipes',
    whenToUse: 'Revisão gamificada com pontos por equipe.',
    defaultTitle: 'Quiz por equipes',
    defaultPoints: 100,
    defaultConfig: () => ({
      questions: [0, 1, 2].map((n) => ({
        id: oid('q'),
        text: `Pergunta ${n + 1}`,
        options: [
          { id: oid(), text: '' },
          { id: oid(), text: '' },
        ],
        correctId: '',
        seconds: 20,
      })),
    }),
  },
  {
    type: 'VERSE_HIGHLIGHT',
    icon: '📖',
    name: 'Destaque no texto',
    whenToUse: 'Alunos tocam no trecho bíblico que mais os marcou.',
    defaultTitle: 'Destaque no texto',
    defaultPoints: 0,
    defaultConfig: () => ({ reference: '', text: '' }),
  },
  {
    type: 'QUESTION_WALL',
    icon: '🙋',
    name: 'Mural de dúvidas',
    whenToUse: 'Perguntas anônimas ao longo de toda a aula.',
    defaultTitle: 'Mural de dúvidas',
    defaultPoints: 0,
    defaultConfig: () => ({ prompt: 'Envie sua dúvida' }),
  },
  {
    type: 'REFLECTION',
    icon: '✨',
    name: 'Reflexão',
    whenToUse: 'Fechamento: uma coisa que vou aplicar esta semana.',
    defaultTitle: 'Reflexão final',
    defaultPoints: 0,
    defaultConfig: () => ({ prompt: '', anonymous: false, requireApproval: false }),
  },
  {
    type: 'TIMER',
    icon: '⏱️',
    name: 'Cronômetro',
    whenToUse: 'Tempo visível para discussões em grupo.',
    defaultTitle: 'Cronômetro',
    defaultPoints: 0,
    defaultConfig: () => ({ seconds: 150, label: 'Discussão' }),
  },
];

export const CATALOG_BY_TYPE: Record<MomentType, MomentCatalogEntry> =
  Object.fromEntries(MOMENT_CATALOG.map((e) => [e.type, e])) as Record<
    MomentType,
    MomentCatalogEntry
  >;
