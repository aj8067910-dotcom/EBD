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

/** Submit an answer for the active moment. */
export function submitAnswer(
  s: RoomSocket,
  momentId: string,
  answer: unknown,
): Promise<Ack<{ accepted: boolean; isCorrect?: boolean | null }>> {
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

  s.on('connect', () => store().setConnected(true));
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
