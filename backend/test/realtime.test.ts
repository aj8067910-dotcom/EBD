import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io as ioClient, type Socket } from 'socket.io-client';
import bcrypt from 'bcryptjs';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { attachRealtime } from '../src/realtime/index.js';
import { prisma } from '../src/prisma.js';
import { generateRoomCode } from '../src/lib/roomCode.js';
import { resetDb } from './helpers.js';

let app: FastifyInstance;
let port: number;

beforeAll(async () => {
  app = await buildApp();
  attachRealtime(app);
  await app.listen({ port: 0, host: '127.0.0.1' });
  const address = app.server.address();
  port = typeof address === 'object' && address ? address.port : 0;
});

afterAll(async () => {
  while (clients.length) clients.pop()?.disconnect();
  await app.close();
});

interface Scenario {
  token: string;
  code: string;
  peerMomentId: string;
  quizMomentId: string;
  pollMomentId: string;
}

async function createScenario(): Promise<Scenario> {
  const code = generateRoomCode();
  const teacher = await prisma.teacher.create({
    data: {
      name: 'Prof',
      email: 'rt@test.dev',
      passwordHash: await bcrypt.hash('senha1234', 4),
    },
  });
  const lesson = await prisma.lesson.create({
    data: { teacherId: teacher.id, title: 'Aula RT', bibleReference: 'Lucas 15' },
  });
  const peer = await prisma.moment.create({
    data: {
      lessonId: lesson.id,
      order: 0,
      type: 'PEER_INSTRUCTION',
      title: 'Peer',
      points: 0,
      correctOptionIds: JSON.stringify(['b']),
      config: JSON.stringify({
        question: 'Graça é?',
        options: [
          { id: 'a', text: 'Merecida' },
          { id: 'b', text: 'Imerecida' },
          { id: 'c', text: 'Punição' },
        ],
        allowMultiple: false,
        discussSeconds: 150,
      }),
    },
  });
  const quiz = await prisma.moment.create({
    data: {
      lessonId: lesson.id,
      order: 1,
      type: 'QUIZ_TEAM',
      title: 'Quiz',
      points: 100,
      config: JSON.stringify({
        questions: [
          {
            id: 'q1',
            text: 'Evangelho?',
            options: [
              { id: 'a', text: 'Lucas' },
              { id: 'b', text: 'Marcos' },
            ],
            correctId: 'a',
            seconds: 20,
          },
          {
            id: 'q2',
            text: 'Quem voltou?',
            options: [
              { id: 'a', text: 'O pai' },
              { id: 'b', text: 'O filho' },
            ],
            correctId: 'b',
            seconds: 20,
          },
        ],
      }),
    },
  });
  const poll = await prisma.moment.create({
    data: {
      lessonId: lesson.id,
      order: 2,
      type: 'POLL',
      title: 'Poll',
      points: 0,
      config: JSON.stringify({
        question: 'Leu?',
        options: [
          { id: 'y', text: 'Sim' },
          { id: 'n', text: 'Não' },
        ],
        allowMultiple: false,
      }),
    },
  });
  await prisma.room.create({
    data: {
      code,
      lessonId: lesson.id,
      teacherId: teacher.id,
      status: 'WAITING',
    },
  });
  const token = app.jwt.sign({ sub: teacher.id, email: teacher.email });
  return {
    token,
    code,
    peerMomentId: peer.id,
    quizMomentId: quiz.id,
    pollMomentId: poll.id,
  };
}

function connect(auth: Record<string, unknown>): Promise<Socket> {
  const socket = ioClient(`http://127.0.0.1:${port}/room`, {
    auth,
    transports: ['websocket'],
    forceNew: true,
  });
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

function once<T = unknown>(socket: Socket, event: string, timeout = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting ${event}`)), timeout);
    socket.once(event, (data: T) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

function emitAck<T = unknown>(socket: Socket, event: string, payload: unknown): Promise<T> {
  return new Promise((resolve) => {
    socket.emit(event, payload, (resp: T) => resolve(resp));
  });
}

const clients: Socket[] = [];
function track(socket: Socket): Socket {
  clients.push(socket);
  return socket;
}

beforeEach(async () => {
  await resetDb();
  while (clients.length) clients.pop()?.disconnect();
});

describe('realtime — Peer Instruction full cycle', () => {
  it('runs VOTE_1 -> DISCUSS -> VOTE_2 -> REVEALED with before/after accuracy', async () => {
    const s = await createScenario();
    const host = track(await connect({ token: s.token, code: s.code }));
    await once(host, 'room:state');
    const student = track(await connect({}));
    const joinAck = await emitAck<{ ok: boolean; data?: { participantId: string } }>(
      student,
      'room:join',
      { code: s.code, nickname: 'Ana' },
    );
    expect(joinAck.ok).toBe(true);

    host.emit('host:startMoment', { momentId: s.peerMomentId });
    await once(host, 'moment:updated');

    // Vote 1: wrong.
    await emitAck(student, 'moment:answer', {
      momentId: s.peerMomentId,
      answer: { type: 'PEER_INSTRUCTION', optionIds: ['a'] },
    });

    host.emit('host:advancePhase', { momentId: s.peerMomentId }); // -> DISCUSS
    await once(host, 'moment:updated');
    host.emit('host:advancePhase', { momentId: s.peerMomentId }); // -> REOPEN
    await once(host, 'moment:updated');

    // Vote 2: correct.
    await emitAck(student, 'moment:answer', {
      momentId: s.peerMomentId,
      answer: { type: 'PEER_INSTRUCTION', optionIds: ['b'] },
    });

    const resultsPromise = once<{
      type: string;
      accuracyBefore: number;
      accuracyAfter: number;
      gain: number;
      suggestion?: string;
    }>(host, 'moment:results');
    host.emit('host:advancePhase', { momentId: s.peerMomentId }); // -> REVEALED
    const results = await resultsPromise;

    expect(results.type).toBe('PEER_INSTRUCTION');
    expect(results.accuracyBefore).toBe(0);
    expect(results.accuracyAfter).toBe(1);
    expect(results.gain).toBe(1);
    expect(results.suggestion).toBe('REEXPLAIN');
  });
});

describe('realtime — Quiz team scoring', () => {
  it('assigns teams, scores correct answers, and reveals a scoreboard', async () => {
    const s = await createScenario();
    const host = track(await connect({ token: s.token, code: s.code }));
    await once(host, 'room:state');
    const student = track(await connect({}));
    const joinAck = await emitAck<{ ok: boolean; data?: { participantId: string } }>(
      student,
      'room:join',
      { code: s.code, nickname: 'Beto' },
    );
    expect(joinAck.ok).toBe(true);

    host.emit('host:assignTeams', { mode: 'random', teamCount: 2 });
    await once(host, 'team:scores');

    host.emit('host:startMoment', { momentId: s.quizMomentId });
    await once(host, 'moment:updated');

    const scorePromise = once<{ teams: { score: number }[] }>(host, 'team:scores');
    await emitAck(student, 'moment:answer', {
      momentId: s.quizMomentId,
      answer: { type: 'QUIZ_TEAM', questionId: 'q1', optionId: 'a' }, // correct
    });
    const scores = await scorePromise;
    const total = scores.teams.reduce((sum, t) => sum + t.score, 0);
    expect(total).toBeGreaterThan(0);

    host.emit('host:advancePhase', { momentId: s.quizMomentId }); // -> q2
    await once(host, 'moment:updated');
    await emitAck(student, 'moment:answer', {
      momentId: s.quizMomentId,
      answer: { type: 'QUIZ_TEAM', questionId: 'q2', optionId: 'b' }, // correct
    });

    const finalResults = once<{ type: string; scores: { score: number }[] }>(
      host,
      'moment:results',
    );
    host.emit('host:advancePhase', { momentId: s.quizMomentId }); // -> REVEALED
    const results = await finalResults;
    expect(results.type).toBe('QUIZ_TEAM');
    const finalTotal = results.scores.reduce((sum, t) => sum + t.score, 0);
    expect(finalTotal).toBeGreaterThan(0);
  });
});

describe('realtime — student reconnection', () => {
  it('recovers the same participant and preserves previous answers', async () => {
    const s = await createScenario();
    const host = track(await connect({ token: s.token, code: s.code }));
    await once(host, 'room:state');

    const student = track(await connect({}));
    const joinAck = await emitAck<{ ok: boolean; data?: { participantId: string } }>(
      student,
      'room:join',
      { code: s.code, nickname: 'Carla' },
    );
    const participantId = joinAck.data!.participantId;

    host.emit('host:startMoment', { momentId: s.pollMomentId });
    await once(host, 'moment:updated');
    await emitAck(student, 'moment:answer', {
      momentId: s.pollMomentId,
      answer: { type: 'POLL', optionIds: ['y'] },
    });

    // Drop and reconnect with the same nickname.
    student.disconnect();
    await new Promise((r) => setTimeout(r, 100));

    const student2 = track(await connect({}));
    const rejoin = await emitAck<{ ok: boolean; data?: { participantId: string } }>(
      student2,
      'room:join',
      { code: s.code, nickname: 'Carla' },
    );
    expect(rejoin.ok).toBe(true);
    expect(rejoin.data!.participantId).toBe(participantId);

    // The earlier answer is still there (no duplicate participant/answer).
    const answers = await prisma.answer.count({ where: { participantId } });
    expect(answers).toBe(1);
    const participants = await prisma.participant.count();
    expect(participants).toBe(1);
  });
});
