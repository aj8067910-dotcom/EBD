import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import {
  joinRoomSchema,
  submitAnswerSchema,
  type ClientToServerEvents,
  type ServerToClientEvents,
  type InterServerEvents,
  type SocketData,
} from '@koinonia/shared';
import { corsOrigins } from '../env.js';
import { AppError } from '../errors.js';
import { RoomStateManager } from './roomState.js';
import type { TeacherTokenPayload } from '../plugins/auth.js';

type AppSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

function emitError(socket: AppSocket, error: unknown) {
  if (error instanceof AppError) {
    socket.emit('error', { code: error.code, message: error.message });
  } else {
    socket.emit('error', {
      code: 'INTERNAL_ERROR',
      message: 'Erro inesperado no servidor',
    });
  }
}

/**
 * Attach the Socket.IO realtime layer (namespace `/room`) to the Fastify HTTP
 * server. Host sockets authenticate with a JWT on the handshake; student
 * sockets identify themselves with a room code + nickname via `room:join`.
 */
export function attachRealtime(app: FastifyInstance): {
  io: Server;
  manager: RoomStateManager;
} {
  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(app.server, {
    cors: { origin: corsOrigins, credentials: true },
  });

  const nsp = io.of('/room');
  const manager = new RoomStateManager(nsp);

  nsp.on('connection', (socket: AppSocket) => {
    void onConnection(socket);
  });

  async function onConnection(socket: AppSocket) {
    // Host handshake: JWT (+ optional room code) grants the host role.
    const token = socket.handshake.auth?.token as string | undefined;
    const code = socket.handshake.auth?.code as string | undefined;

    if (token) {
      try {
        const payload = app.jwt.verify<TeacherTokenPayload>(token);
        socket.data.role = 'host';
        socket.data.teacherId = payload.sub;
        if (code) {
          const room = await manager.getOrLoad(code.toUpperCase());
          if (room && room.teacherId === payload.sub) {
            socket.data.roomCode = room.code;
            await socket.join(room.code);
            socket.emit('room:state', manager.stateView(room));
            manager.emitParticipants(room);
            await manager.emitWall(room);
          }
        }
      } catch {
        socket.data.role = 'participant';
      }
    } else {
      socket.data.role = 'participant';
    }

    registerStudentHandlers(socket);
    registerHostHandlers(socket);

    socket.on('disconnect', () => manager.markOffline(socket.id));
  }

  function registerStudentHandlers(socket: AppSocket) {
    socket.on('room:join', async (payload, ack) => {
      try {
        const { code, nickname } = joinRoomSchema.parse(payload);
        const { room, participant } = await manager.join(code, nickname, socket.id);
        socket.data.role = 'participant';
        socket.data.roomCode = room.code;
        socket.data.participantId = participant.id;
        await socket.join(room.code);

        const state = manager.stateView(room);
        socket.emit('room:state', state);
        manager.emitParticipants(room);
        await manager.emitWall(room);
        if (room.activeMomentId) await manager.emitResults(room);

        ack?.({ ok: true, data: { participantId: participant.id, state } });
      } catch (error) {
        emitError(socket, error);
        if (error instanceof AppError) {
          ack?.({ ok: false, error: { code: error.code, message: error.message } });
        }
      }
    });

    socket.on('room:leave', ({ code }) => {
      void socket.leave(code);
      manager.markOffline(socket.id);
    });

    socket.on('moment:answer', async ({ momentId, answer }, ack) => {
      try {
        const parsed = submitAnswerSchema.parse(answer);
        const room = await requireRoom(socket);
        if (!socket.data.participantId) throw new AppError('UNAUTHORIZED', 'Entre na sala primeiro', 401);
        await manager.submitAnswer(
          room,
          socket.data.participantId,
          momentId,
          parsed as unknown as Record<string, unknown>,
        );
        ack?.({ ok: true, data: { accepted: true } });
      } catch (error) {
        emitError(socket, error);
        if (error instanceof AppError) {
          ack?.({ ok: false, error: { code: error.code, message: error.message } });
        }
      }
    });

    socket.on('wall:post', async ({ text }, ack) => {
      try {
        const room = await requireRoom(socket);
        const item = await manager.postWall(
          room,
          socket.data.participantId ?? null,
          text,
        );
        ack?.({ ok: true, data: item });
      } catch (error) {
        emitError(socket, error);
      }
    });

    socket.on('wall:upvote', async ({ id }) => {
      try {
        const room = await requireRoom(socket);
        await manager.upvoteWall(room, id);
      } catch (error) {
        emitError(socket, error);
      }
    });
  }

  function registerHostHandlers(socket: AppSocket) {
    const host = <T>(handler: (room: Awaited<ReturnType<typeof requireRoom>>, arg: T) => Promise<void>) => {
      return async (arg: T) => {
        try {
          const room = await requireHostRoom(socket);
          await handler(room, arg);
        } catch (error) {
          emitError(socket, error);
        }
      };
    };

    socket.on(
      'host:assignTeams',
      host<{ mode: 'random' | 'choose'; teamCount: number; names?: string[] }>(
        (room, { mode, teamCount, names }) =>
          manager.assignTeams(room, mode, teamCount, names),
      ),
    );
    socket.on(
      'host:startMoment',
      host<{ momentId: string }>((room, { momentId }) =>
        manager.startMoment(room, momentId),
      ),
    );
    socket.on(
      'host:advancePhase',
      host<{ momentId: string }>((room, { momentId }) =>
        manager.advancePhase(room, momentId),
      ),
    );
    socket.on(
      'host:closeMoment',
      host<{ momentId: string }>((room, { momentId }) =>
        manager.closeMoment(room, momentId),
      ),
    );
    socket.on(
      'host:approveAnswer',
      host<{ answerId: string; approved: boolean }>((room, { answerId, approved }) =>
        manager.approveAnswer(room, answerId, approved),
      ),
    );
    socket.on(
      'host:startTimer',
      host<{ seconds: number; label?: string }>(async (room, { seconds, label }) => {
        manager.startTimer(room, seconds, label ?? '');
      }),
    );
  }

  async function requireRoom(socket: AppSocket) {
    if (!socket.data.roomCode) {
      throw new AppError('NOT_IN_ROOM', 'Você não está em uma sala', 400);
    }
    const room = await manager.getOrLoad(socket.data.roomCode);
    if (!room) throw new AppError('NOT_FOUND', 'Sala não encontrada', 404);
    return room;
  }

  async function requireHostRoom(socket: AppSocket) {
    if (socket.data.role !== 'host' || !socket.data.teacherId) {
      throw new AppError('FORBIDDEN', 'Apenas o professor pode fazer isso', 403);
    }
    const room = await requireRoom(socket);
    if (room.teacherId !== socket.data.teacherId) {
      throw new AppError('FORBIDDEN', 'Você não é o dono desta sala', 403);
    }
    return room;
  }

  app.addHook('onClose', async () => {
    manager.dispose();
    await io.close();
  });

  return { io, manager };
}
