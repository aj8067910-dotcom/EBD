import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';

export async function makeApp(): Promise<FastifyInstance> {
  const app = await buildApp();
  await app.ready();
  return app;
}

/** Delete all rows in FK-safe order for an isolated test. */
export async function resetDb() {
  await prisma.answer.deleteMany();
  await prisma.wallQuestion.deleteMany();
  await prisma.preClassResponse.deleteMany();
  await prisma.participant.deleteMany();
  await prisma.team.deleteMany();
  await prisma.room.deleteMany();
  await prisma.moment.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.teacher.deleteMany();
}

export const validPeerInstructionMoment = {
  type: 'PEER_INSTRUCTION' as const,
  title: 'Conceito difícil',
  points: 10,
  isPreClass: false,
  correctOptionIds: ['b'],
  config: {
    question: 'Qual a melhor definição de graça?',
    options: [
      { id: 'a', text: 'Recompensa merecida' },
      { id: 'b', text: 'Favor imerecido' },
      { id: 'c', text: 'Punição' },
    ],
    allowMultiple: false,
  },
};

export const validPollMoment = {
  type: 'POLL' as const,
  title: 'Enquete de abertura',
  points: 0,
  isPreClass: false,
  config: {
    question: 'Você já leu Lucas 15?',
    options: [
      { id: 'y', text: 'Sim' },
      { id: 'n', text: 'Não' },
    ],
    allowMultiple: false,
  },
};

export const validReflectionMoment = {
  type: 'REFLECTION' as const,
  title: 'Fechamento',
  points: 0,
  isPreClass: false,
  config: { prompt: 'O que vou aplicar?', anonymous: false, requireApproval: false },
};
