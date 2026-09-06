/**
 * Connect N student sockets to a room and answer the active moment randomly.
 * Useful for exercising the projector (`/screen/:code`) under load.
 *
 *   npx tsx scripts/simulate-students.ts <ROOM_CODE> [count] [wsUrl]
 *   npx tsx scripts/simulate-students.ts K3M9PQ 3 http://localhost:3333
 */
import { io, type Socket } from 'socket.io-client';

const code = (process.argv[2] ?? '').toUpperCase();
const count = Number(process.argv[3] ?? 3);
const wsUrl = process.argv[4] ?? 'http://localhost:3333';

if (!code) {
  console.error('Usage: tsx scripts/simulate-students.ts <ROOM_CODE> [count] [wsUrl]');
  process.exit(1);
}

interface Option {
  id: string;
}

function randomFrom<T>(arr: T[]): T | undefined {
  return arr[Math.floor(Math.random() * arr.length)];
}

const WORDS = ['graça', 'perdão', 'amor', 'fé', 'esperança', 'alegria'];

function buildAnswer(moment: {
  id: string;
  type: string;
  config: Record<string, unknown>;
}): unknown | null {
  const config = moment.config ?? {};
  switch (moment.type) {
    case 'POLL':
    case 'PEER_INSTRUCTION': {
      const opts = (config.options as Option[]) ?? [];
      const opt = randomFrom(opts);
      return opt ? { type: moment.type, optionIds: [opt.id] } : null;
    }
    case 'WORD_CLOUD':
      return { type: 'WORD_CLOUD', word: randomFrom(WORDS) };
    case 'OPEN_QUESTION':
    case 'REFLECTION':
      return { type: moment.type, text: `Resposta simulada ${Math.random().toString(36).slice(2, 7)}` };
    case 'VERSE_HIGHLIGHT':
      return { type: 'VERSE_HIGHLIGHT', wordIndices: [Math.floor(Math.random() * 5)] };
    case 'QUIZ_TEAM': {
      const q = (config.question as { id: string; options: Option[] } | null) ?? null;
      if (!q) return null;
      const opt = randomFrom(q.options);
      return opt ? { type: 'QUIZ_TEAM', questionId: q.id, optionId: opt.id } : null;
    }
    default:
      return null;
  }
}

function spawn(index: number): Socket {
  const socket = io(`${wsUrl}/room`, { transports: ['websocket'], forceNew: true });
  const answered = new Set<string>();

  const tryAnswer = (moment: { id: string; type: string; config: Record<string, unknown> } | null, phase: string | null) => {
    if (!moment) return;
    const answerable =
      phase === 'OPEN' || phase === 'REOPEN';
    if (!answerable) return;
    const key = `${moment.id}:${phase}`;
    if (answered.has(key)) return;
    const answer = buildAnswer(moment);
    if (!answer) return;
    answered.add(key);
    setTimeout(() => {
      socket.emit('moment:answer', { momentId: moment.id, answer });
    }, Math.random() * 800);
  };

  socket.on('connect', () => {
    socket.emit('room:join', { code, nickname: `Aluno${index + 1}` }, (resp: { ok: boolean }) => {
      console.log(`Aluno${index + 1}: join ${resp?.ok ? 'ok' : 'falhou'}`);
    });
  });

  socket.on('room:state', (state: { activeMoment: { id: string; type: string; phase: string; config: Record<string, unknown> } | null }) => {
    if (state.activeMoment) tryAnswer(state.activeMoment, state.activeMoment.phase);
  });

  socket.on('moment:updated', (payload: { moment: { id: string; type: string; config: Record<string, unknown> } | null; phase: string | null }) => {
    tryAnswer(payload.moment, payload.phase);
  });

  socket.on('error', (e: { message: string }) => console.log(`Aluno${index + 1} erro:`, e.message));
  return socket;
}

console.log(`Conectando ${count} alunos simulados à sala ${code} em ${wsUrl}…`);
const sockets = Array.from({ length: count }, (_, i) => spawn(i));

process.on('SIGINT', () => {
  sockets.forEach((s) => s.disconnect());
  process.exit(0);
});
