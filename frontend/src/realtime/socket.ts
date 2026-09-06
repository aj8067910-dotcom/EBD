import { io, type Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from '@koinonia/shared';
import { WS_URL } from '../config.js';
import { useRoomStore } from '../store/useRoomStore.js';

export type RoomSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: RoomSocket | null = null;

interface ConnectOptions {
  /** Host JWT (teacher panel / projector may connect as host). */
  token?: string;
  /** Room code to auto-join on the host handshake. */
  code?: string;
}

/**
 * Get (or lazily create) the singleton Socket.IO connection to the `/room`
 * namespace, wiring server events into the Zustand store.
 */
export function getSocket(opts: ConnectOptions = {}): RoomSocket {
  if (socket) return socket;

  socket = io(`${WS_URL}/room`, {
    autoConnect: true,
    transports: ['websocket'],
    // Exponential-ish reconnection (PARTE 7 hardening).
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    auth: { token: opts.token, code: opts.code },
  }) as RoomSocket;

  bindStore(socket);
  return socket;
}

/** Connect as the host (teacher) with a JWT, auto-joining the room. */
export function connectHost(token: string, code: string): RoomSocket {
  disconnectSocket();
  socket = io(`${WS_URL}/room`, {
    autoConnect: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    auth: { token, code },
  }) as RoomSocket;
  bindStore(socket);
  return socket;
}

/** Connect as a passive projector viewer (no participant, auto re-join). */
export function connectScreen(code: string): RoomSocket {
  disconnectSocket();
  const s = io(`${WS_URL}/room`, {
    autoConnect: true,
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  }) as RoomSocket;
  socket = s;
  bindStore(s);
  const join = () => s.emit('screen:join', { code });
  s.on('connect', join);
  return s;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  useRoomStore.getState().reset();
}

/* Host command helpers. */
export const host = {
  startMoment: (s: RoomSocket, momentId: string) =>
    s.emit('host:startMoment', { momentId }),
  advancePhase: (s: RoomSocket, momentId: string) =>
    s.emit('host:advancePhase', { momentId }),
  closeMoment: (s: RoomSocket, momentId: string) =>
    s.emit('host:closeMoment', { momentId }),
  approveAnswer: (s: RoomSocket, answerId: string, approved: boolean) =>
    s.emit('host:approveAnswer', { answerId, approved }),
  startTimer: (s: RoomSocket, seconds: number, label?: string) =>
    s.emit('host:startTimer', { seconds, label }),
  assignTeams: (
    s: RoomSocket,
    mode: 'random' | 'choose',
    teamCount: number,
    names?: string[],
  ) => s.emit('host:assignTeams', { mode, teamCount, names }),
  markWall: (
    s: RoomSocket,
    id: string,
    patch: { answered?: boolean; displayed?: boolean },
  ) => s.emit('host:markWall', { id, ...patch }),
};

interface Ack<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
}

/** Join a room as a student; resolves with the participant id + state. */
export function joinRoom(
  s: RoomSocket,
  code: string,
  nickname: string,
): Promise<Ack<{ participantId: string; state: unknown }>> {
  return new Promise((resolve) => {
    s.emit('room:join', { code, nickname }, (resp) => {
      if (resp?.ok && resp.data) {
        useRoomStore.getState().setParticipantId(resp.data.participantId);
      }
      resolve(resp as Ack<{ participantId: string; state: unknown }>);
    });
  });
}

// Offline-tolerant answer queue: if the network drops mid-answer, we queue it
// and resend on reconnect. Resends are idempotent server-side (@@unique on
// momentId+participantId+phase), so duplicates simply upsert.
const answerQueue: { momentId: string; answer: unknown }[] = [];

function flushAnswerQueue(s: RoomSocket) {
  while (answerQueue.length > 0) {
    const item = answerQueue.shift();
    if (item) s.emit('moment:answer', { momentId: item.momentId, answer: item.answer as never });
  }
}

/** Submit an answer for the active moment (queued while offline). */
export function submitAnswer(
  s: RoomSocket,
  momentId: string,
  answer: unknown,
): Promise<Ack<{ accepted: boolean; isCorrect?: boolean | null }>> {
  if (!s.connected) {
    answerQueue.push({ momentId, answer });
    return Promise.resolve({ ok: true, data: { accepted: true } });
  }
  return new Promise((resolve) => {
    // The answer union is validated server-side; cast at the boundary.
    s.emit(
      'moment:answer',
      { momentId, answer: answer as never },
      (resp) => resolve(resp as Ack<{ accepted: boolean; isCorrect?: boolean | null }>),
    );
  });
}

export function postWall(s: RoomSocket, text: string) {
  return new Promise((resolve) => {
    s.emit('wall:post', { text }, (resp) => resolve(resp));
  });
}

export function upvoteWall(s: RoomSocket, id: string) {
  s.emit('wall:upvote', { id });
}

function bindStore(s: RoomSocket) {
  const store = useRoomStore.getState;

  s.on('connect', () => {
    store().setConnected(true);
    flushAnswerQueue(s);
  });
  s.on('disconnect', () => store().setConnected(false));

  s.on('room:state', (state) => store().applyRoomState(state));

  s.on('room:participants', ({ participants, count }) => {
    const myId = store().myParticipantId;
    const me = myId ? participants.find((p) => p.id === myId) : undefined;
    store().applyParticipants(count, me?.teamId ?? null);
  });

  s.on('moment:updated', ({ moment, phase, answeredCount, participantCount }) => {
    store().applyMomentUpdated(moment, phase, answeredCount, participantCount);
  });

  s.on('moment:results', (results) => store().applyResults(results));
  s.on('wall:updated', ({ items }) => store().applyWall(items));
  s.on('timer:tick', (tick) => store().applyTimer(tick));
  s.on('team:scores', ({ teams }) => store().applyScores(teams));
  s.on('error', (err) => store().setError(err));
}
