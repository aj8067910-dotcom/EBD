import type { Namespace } from 'socket.io';
import {
  MomentPhase,
  sanitizeText,
  type ActiveMomentView,
  type RoomStateView,
  type WallItem,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@koinonia/shared';
import { prisma } from '../prisma.js';
import { AppError, Errors } from '../errors.js';
import { isRoomExpired } from '../lib/constants.js';
import { computeResults } from './results.js';
import {
  quizPhase,
  type MomentRuntime,
  type ParticipantRuntime,
  type RoomRuntime,
} from './types.js';
import { quizPoints } from './aggregators/index.js';

export const MAX_PARTICIPANTS = 200;
const RECONNECT_WINDOW_MS = 30 * 60 * 1000;
const DEFAULT_DISCUSS_SECONDS = 150;
const RESULTS_THROTTLE_MS = 200; // <= 5 broadcasts/s per room

const TEAM_COLORS = [
  '#4f46e5', // indigo
  '#e11d48', // rose
  '#059669', // emerald
  '#d97706', // amber
  '#7c3aed', // violet
  '#0891b2', // cyan
];
const BIBLICAL_TEAM_NAMES = [
  'Judá',
  'Efraim',
  'Levi',
  'Benjamim',
  'Naftali',
  'Zebulom',
];

type Nsp = Namespace<ClientToServerEvents, ServerToClientEvents>;

/**
 * Authoritative in-memory state for live rooms, with write-through persistence
 * of answers and periodic persistence of room/team state. Rebuilds runtime
 * from the database on demand (e.g. after a server restart).
 */
export class RoomStateManager {
  private rooms = new Map<string, RoomRuntime>();
  private resultsTimers = new Map<string, NodeJS.Timeout>();

  constructor(private nsp: Nsp) {}

  /* ------------------------------------------------------------------ load */

  async getOrLoad(code: string): Promise<RoomRuntime | null> {
    const existing = this.rooms.get(code);
    if (existing) return existing;

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        lesson: { include: { moments: { orderBy: { order: 'asc' } } } },
        teams: true,
        participants: true,
      },
    });
    if (!room) return null;

    const moments = new Map<string, MomentRuntime>();
    for (const m of room.lesson.moments) {
      moments.set(m.id, {
        id: m.id,
        type: m.type as MomentRuntime['type'],
        title: m.title,
        points: m.points,
        config: safeParse(m.config),
        correctOptionIds: m.correctOptionIds
          ? (safeParse(m.correctOptionIds) as unknown as string[])
          : null,
        imageUrl: m.imageUrl ?? null,
        imageAlt: m.imageAlt ?? null,
      });
    }

    const participants = new Map<string, ParticipantRuntime>();
    for (const p of room.participants) {
      participants.set(p.id, {
        id: p.id,
        nickname: p.nickname,
        teamId: p.teamId,
        socketId: null,
        online: false,
        joinedAt: p.joinedAt.getTime(),
        lastSeen: p.lastSeenAt.getTime(),
      });
    }

    const teams = new Map(
      room.teams.map((t) => [
        t.id,
        { id: t.id, name: t.name, color: t.color, score: t.score },
      ]),
    );

    const runtime: RoomRuntime = {
      code: room.code,
      roomId: room.id,
      lessonId: room.lessonId,
      teacherId: room.teacherId,
      lessonTitle: room.lesson.title,
      status: room.status as RoomRuntime['status'],
      createdAt: room.createdAt.getTime(),
      moments,
      momentOrder: room.lesson.moments.map((m) => m.id),
      participants,
      teams,
      activeMomentId: room.activeMomentId,
      activePhase: (room.activePhase as MomentPhase | null) ?? null,
      timer: null,
      quiz: null,
      hostSocketIds: new Set<string>(),
    };
    this.rooms.set(code, runtime);
    return runtime;
  }

  /* --------------------------------------------------------------- views */

  activeMomentView(room: RoomRuntime): ActiveMomentView | null {
    if (!room.activeMomentId) return null;
    const moment = room.moments.get(room.activeMomentId);
    if (!moment) return null;
    return {
      id: moment.id,
      type: moment.type,
      title: moment.title,
      phase: room.activePhase ?? MomentPhase.DRAFT,
      points: moment.points,
      config: this.publicConfig(room, moment),
      imageUrl: moment.imageUrl,
      imageAlt: moment.imageAlt,
    };
  }

  /** Config as seen by clients (quiz exposes only the current question). */
  private publicConfig(room: RoomRuntime, moment: MomentRuntime): unknown {
    if (moment.type === 'QUIZ_TEAM' && room.quiz) {
      const questions = (moment.config.questions as unknown[]) ?? [];
      const current = questions[room.quiz.questionIndex] as
        | Record<string, unknown>
        | undefined;
      return {
        questionIndex: room.quiz.questionIndex,
        questionCount: questions.length,
        // Never expose correctId to clients.
        question: current
          ? { id: current.id, text: current.text, options: current.options }
          : null,
      };
    }
    return moment.config;
  }

  stateView(room: RoomRuntime): RoomStateView {
    return {
      code: room.code,
      status: room.status,
      lessonTitle: room.lessonTitle,
      teams: [...room.teams.values()],
      participantCount: this.onlineCount(room),
      activeMoment: this.activeMomentView(room),
    };
  }

  private onlineCount(room: RoomRuntime): number {
    let n = 0;
    for (const p of room.participants.values()) if (p.online) n += 1;
    return n;
  }

  /* --------------------------------------------------------- broadcasting */

  emitState(room: RoomRuntime) {
    this.nsp.to(room.code).emit('room:state', this.stateView(room));
  }

  emitParticipants(room: RoomRuntime) {
    const participants = [...room.participants.values()].map((p) => ({
      id: p.id,
      nickname: p.nickname,
      teamId: p.teamId,
      online: p.online,
    }));
    this.nsp
      .to(room.code)
      .emit('room:participants', { participants, count: this.onlineCount(room) });
  }

  emitScores(room: RoomRuntime) {
    this.nsp.to(room.code).emit('team:scores', { teams: [...room.teams.values()] });
  }

  async emitMomentUpdated(room: RoomRuntime) {
    const answeredCount = await this.answeredCount(room);
    this.nsp.to(room.code).emit('moment:updated', {
      moment: this.activeMomentView(room),
      phase: room.activePhase,
      answeredCount,
      participantCount: this.onlineCount(room),
    });
  }

  /** Throttled results broadcast (<= 5/s per room). */
  scheduleResults(room: RoomRuntime) {
    if (this.resultsTimers.has(room.code)) return;
    const handle = setTimeout(() => {
      this.resultsTimers.delete(room.code);
      void this.emitResults(room);
    }, RESULTS_THROTTLE_MS);
    this.resultsTimers.set(room.code, handle);
  }

  async emitResults(room: RoomRuntime) {
    if (!room.activeMomentId) return;
    const moment = room.moments.get(room.activeMomentId);
    if (!moment) return;
    const results = await computeResults(room, moment);
    if (results) this.nsp.to(room.code).emit('moment:results', results);

    // Hosts additionally get unapproved cards for moderation (open/reflection).
    if (
      (moment.type === 'OPEN_QUESTION' || moment.type === 'REFLECTION') &&
      room.hostSocketIds.size > 0
    ) {
      const full = await computeResults(room, moment, { includeUnapproved: true });
      if (full) {
        for (const socketId of room.hostSocketIds) {
          this.nsp.to(socketId).emit('moment:results', full);
        }
      }
    }
  }

  /** Register/unregister a connected host socket for a room. */
  addHost(room: RoomRuntime, socketId: string) {
    room.hostSocketIds.add(socketId);
  }

  removeHost(socketId: string) {
    for (const room of this.rooms.values()) room.hostSocketIds.delete(socketId);
  }

  async emitWall(room: RoomRuntime) {
    const items = await this.loadWall(room);
    this.nsp.to(room.code).emit('wall:updated', { items });
  }

  private async answeredCount(room: RoomRuntime): Promise<number> {
    if (!room.activeMomentId) return 0;
    const phase = this.currentAnswerPhase(room);
    if (!phase) return 0;
    const rows = await prisma.answer.findMany({
      where: { momentId: room.activeMomentId, roomId: room.roomId, phase },
      select: { participantId: true },
    });
    return new Set(rows.map((r) => r.participantId)).size;
  }

  private async loadWall(room: RoomRuntime): Promise<WallItem[]> {
    const rows = await prisma.wallQuestion.findMany({
      where: { roomId: room.roomId },
      orderBy: [{ upvotes: 'desc' }, { createdAt: 'asc' }],
    });
    return rows.map((w) => ({
      id: w.id,
      text: w.text,
      upvotes: w.upvotes,
      answered: w.answered,
      displayed: w.displayed,
      createdAt: w.createdAt.toISOString(),
    }));
  }

  /* ------------------------------------------------------------- students */

  async join(
    code: string,
    rawNickname: string,
    socketId: string,
  ): Promise<{ room: RoomRuntime; participant: ParticipantRuntime }> {
    const room = await this.getOrLoad(code);
    if (!room) throw Errors.notFound('Sala não encontrada');
    if (room.status === 'ENDED') throw Errors.forbidden('Esta aula já foi encerrada');
    if (isRoomExpired(room.createdAt, room.status)) {
      throw Errors.forbidden('Esta sala expirou (validade de 6 horas)');
    }

    const nickname = rawNickname.trim().slice(0, 20);

    // Reconnection: reuse an existing participant with the same nickname when
    // it is offline (or within the reconnection window).
    const existing = [...room.participants.values()].find(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase(),
    );
    if (existing) {
      const withinWindow = Date.now() - existing.lastSeen < RECONNECT_WINDOW_MS;
      if (existing.online && withinWindow) {
        throw new AppError(
          'NICKNAME_TAKEN',
          `Apelido em uso. Tente "${nickname}${Math.floor(Math.random() * 90 + 10)}".`,
          409,
        );
      }
      existing.online = true;
      existing.socketId = socketId;
      existing.lastSeen = Date.now();
      await prisma.participant.update({
        where: { id: existing.id },
        data: { socketId, lastSeenAt: new Date() },
      });
      return { room, participant: existing };
    }

    if (this.onlineCount(room) >= MAX_PARTICIPANTS) {
      throw new AppError('ROOM_FULL', 'Sala cheia (limite de 200)', 403);
    }

    const created = await prisma.participant.create({
      data: { roomId: room.roomId, nickname, socketId },
    });
    const participant: ParticipantRuntime = {
      id: created.id,
      nickname: created.nickname,
      teamId: null,
      socketId,
      online: true,
      joinedAt: created.joinedAt.getTime(),
      lastSeen: Date.now(),
    };
    room.participants.set(participant.id, participant);
    return { room, participant };
  }

  markOffline(socketId: string) {
    for (const room of this.rooms.values()) {
      for (const p of room.participants.values()) {
        if (p.socketId === socketId) {
          p.online = false;
          p.lastSeen = Date.now();
          void prisma.participant
            .update({ where: { id: p.id }, data: { lastSeenAt: new Date() } })
            .catch(() => undefined);
          this.emitParticipants(room);
          return;
        }
      }
    }
  }

  /** Phase under which a new answer is currently stored, or null if closed. */
  private currentAnswerPhase(room: RoomRuntime): string | null {
    if (!room.activeMomentId || !room.activePhase) return null;
    const moment = room.moments.get(room.activeMomentId);
    if (!moment) return null;
    if (moment.type === 'QUIZ_TEAM') {
      if (room.activePhase !== MomentPhase.OPEN || !room.quiz) return null;
      const questions = (moment.config.questions as { id: string }[]) ?? [];
      const q = questions[room.quiz.questionIndex];
      return q ? quizPhase(q.id) : null;
    }
    if (
      room.activePhase === MomentPhase.OPEN ||
      room.activePhase === MomentPhase.REOPEN
    ) {
      return room.activePhase;
    }
    return null;
  }

  async submitAnswer(
    room: RoomRuntime,
    participantId: string,
    momentId: string,
    answer: Record<string, unknown>,
  ) {
    if (momentId !== room.activeMomentId) {
      throw Errors.validation('Este momento não está ativo');
    }
    const moment = room.moments.get(momentId);
    if (!moment) throw Errors.notFound('Momento não encontrado');
    const phase = this.currentAnswerPhase(room);
    if (!phase) throw Errors.validation('As respostas estão fechadas');

    const participant = room.participants.get(participantId);
    if (!participant) throw Errors.unauthorized();

    const { payload, isCorrect, points } = this.gradeAnswer(room, moment, answer);

    await prisma.answer.upsert({
      where: {
        momentId_participantId_phase: { momentId, participantId, phase },
      },
      update: { payload: JSON.stringify(payload), isCorrect },
      create: {
        momentId,
        roomId: room.roomId,
        participantId,
        phase,
        payload: JSON.stringify(payload),
        isCorrect,
      },
    });

    // Quiz: award points to the participant's team (once per question).
    if (moment.type === 'QUIZ_TEAM' && points > 0 && participant.teamId) {
      const team = room.teams.get(participant.teamId);
      if (team) {
        team.score += points;
        await prisma.team.update({
          where: { id: team.id },
          data: { score: team.score },
        });
        this.emitScores(room);
      }
    }

    this.scheduleResults(room);
    void this.emitMomentUpdated(room);
    return { isCorrect };
  }

  /** Sanitize/grade an answer by moment type, returning payload + scoring. */
  private gradeAnswer(
    room: RoomRuntime,
    moment: MomentRuntime,
    answer: Record<string, unknown>,
  ): { payload: Record<string, unknown>; isCorrect: boolean | null; points: number } {
    switch (moment.type) {
      case 'PEER_INSTRUCTION': {
        const optionIds = (answer.optionIds as string[]) ?? [];
        const correct = new Set(moment.correctOptionIds ?? []);
        const isCorrect =
          correct.size > 0 &&
          optionIds.length === correct.size &&
          optionIds.every((id) => correct.has(id));
        return { payload: { type: moment.type, optionIds }, isCorrect, points: 0 };
      }
      case 'POLL':
        return {
          payload: { type: moment.type, optionIds: (answer.optionIds as string[]) ?? [] },
          isCorrect: null,
          points: 0,
        };
      case 'WORD_CLOUD':
        return {
          payload: {
            type: moment.type,
            word: sanitizeText(String(answer.word ?? ''), 40),
          },
          isCorrect: null,
          points: 0,
        };
      case 'OPEN_QUESTION':
      case 'REFLECTION':
        return {
          payload: {
            type: moment.type,
            text: sanitizeText(String(answer.text ?? ''), 280),
          },
          isCorrect: null,
          points: 0,
        };
      case 'VERSE_HIGHLIGHT':
        return {
          payload: {
            type: moment.type,
            wordIndices: (answer.wordIndices as number[]) ?? [],
          },
          isCorrect: null,
          points: 0,
        };
      case 'QUIZ_TEAM': {
        const questions =
          (moment.config.questions as {
            id: string;
            correctId: string;
            seconds: number;
          }[]) ?? [];
        const q = room.quiz ? questions[room.quiz.questionIndex] : undefined;
        const optionId = String(answer.optionId ?? '');
        const isCorrect = !!q && optionId === q.correctId;
        const elapsed = room.quiz ? Date.now() - room.quiz.questionOpenedAt : 0;
        const totalMs = (q?.seconds ?? 0) * 1000;
        const points = quizPoints(moment.points, isCorrect, elapsed, totalMs);
        return {
          payload: { type: moment.type, questionId: q?.id ?? '', optionId },
          isCorrect,
          points,
        };
      }
      default:
        return { payload: { type: moment.type }, isCorrect: null, points: 0 };
    }
  }

  /* ----------------------------------------------------------------- wall */

  async postWall(room: RoomRuntime, participantId: string | null, rawText: string) {
    const text = sanitizeText(rawText, 280);
    if (!text) throw Errors.validation('Pergunta vazia');
    const created = await prisma.wallQuestion.create({
      data: { roomId: room.roomId, participantId, text },
    });
    await this.emitWall(room);
    return {
      id: created.id,
      text: created.text,
      upvotes: created.upvotes,
      answered: created.answered,
      displayed: created.displayed,
      createdAt: created.createdAt.toISOString(),
    } satisfies WallItem;
  }

  async upvoteWall(room: RoomRuntime, id: string) {
    await prisma.wallQuestion.update({
      where: { id },
      data: { upvotes: { increment: 1 } },
    });
    await this.emitWall(room);
  }

  /** Host moderation of a wall question (mark answered / display on projector). */
  async markWall(
    room: RoomRuntime,
    id: string,
    patch: { answered?: boolean; displayed?: boolean },
  ) {
    await prisma.wallQuestion.update({ where: { id }, data: patch });
    await this.emitWall(room);
  }

  /* ---------------------------------------------------------------- teams */

  async assignTeams(
    room: RoomRuntime,
    mode: 'random' | 'choose',
    teamCount: number,
    names?: string[],
  ) {
    const count = Math.max(2, Math.min(6, teamCount));
    // Clear existing teams (participants.teamId set null via onDelete).
    await prisma.team.deleteMany({ where: { roomId: room.roomId } });
    room.teams.clear();
    for (const p of room.participants.values()) p.teamId = null;

    for (let i = 0; i < count; i += 1) {
      const name = names?.[i]?.trim() || BIBLICAL_TEAM_NAMES[i] || `Equipe ${i + 1}`;
      const color = TEAM_COLORS[i % TEAM_COLORS.length]!;
      const team = await prisma.team.create({
        data: { roomId: room.roomId, name, color, score: 0 },
      });
      room.teams.set(team.id, { id: team.id, name, color, score: 0 });
    }

    if (mode === 'random') {
      const teamIds = [...room.teams.keys()];
      let i = 0;
      for (const p of room.participants.values()) {
        const teamId = teamIds[i % teamIds.length]!;
        p.teamId = teamId;
        await prisma.participant.update({
          where: { id: p.id },
          data: { teamId },
        });
        i += 1;
      }
    }

    this.emitState(room);
    this.emitParticipants(room);
    this.emitScores(room);
  }

  /* ------------------------------------------------------- host: moments */

  async startMoment(room: RoomRuntime, momentId: string) {
    const moment = room.moments.get(momentId);
    if (!moment) throw Errors.notFound('Momento não encontrado');
    this.stopTimer(room);

    room.status = 'LIVE';
    room.activeMomentId = momentId;
    room.activePhase = MomentPhase.OPEN;
    room.quiz = null;

    if (moment.type === 'QUIZ_TEAM') {
      room.quiz = { questionIndex: 0, questionOpenedAt: Date.now() };
      const questions = (moment.config.questions as { seconds: number }[]) ?? [];
      const seconds = questions[0]?.seconds ?? 30;
      this.startTimer(room, seconds, 'Pergunta 1');
    }

    await this.persistRoom(room);
    this.emitState(room);
    await this.emitMomentUpdated(room);
    this.scheduleResults(room);
  }

  async advancePhase(room: RoomRuntime, momentId: string) {
    if (room.activeMomentId !== momentId) {
      throw Errors.validation('Momento não está ativo');
    }
    const moment = room.moments.get(momentId);
    if (!moment) throw Errors.notFound('Momento não encontrado');

    switch (moment.type) {
      case 'PEER_INSTRUCTION':
        await this.advancePeerInstruction(room, moment);
        break;
      case 'QUIZ_TEAM':
        await this.advanceQuiz(room, moment);
        break;
      case 'OPEN_QUESTION':
      case 'REFLECTION':
        room.activePhase = MomentPhase.CLOSED;
        break;
      default:
        // POLL, WORD_CLOUD, VERSE_HIGHLIGHT: OPEN -> CLOSED -> REVEALED
        room.activePhase =
          room.activePhase === MomentPhase.OPEN
            ? MomentPhase.CLOSED
            : MomentPhase.REVEALED;
    }

    await this.persistRoom(room);
    this.emitState(room);
    await this.emitMomentUpdated(room);
    await this.emitResults(room);
  }

  private async advancePeerInstruction(room: RoomRuntime, moment: MomentRuntime) {
    switch (room.activePhase) {
      case MomentPhase.OPEN: {
        room.activePhase = MomentPhase.DISCUSS;
        const discussSeconds =
          (moment.config.discussSeconds as number) ?? DEFAULT_DISCUSS_SECONDS;
        this.startTimer(room, discussSeconds, 'Discussão em grupo');
        break;
      }
      case MomentPhase.DISCUSS:
        this.stopTimer(room);
        room.activePhase = MomentPhase.REOPEN;
        break;
      case MomentPhase.REOPEN:
        room.activePhase = MomentPhase.REVEALED;
        break;
      default:
        break;
    }
  }

  private async advanceQuiz(room: RoomRuntime, moment: MomentRuntime) {
    const questions = (moment.config.questions as { seconds: number }[]) ?? [];
    if (!room.quiz) room.quiz = { questionIndex: 0, questionOpenedAt: Date.now() };

    if (room.quiz.questionIndex < questions.length - 1) {
      room.quiz.questionIndex += 1;
      room.quiz.questionOpenedAt = Date.now();
      room.activePhase = MomentPhase.OPEN;
      const seconds = questions[room.quiz.questionIndex]?.seconds ?? 30;
      this.startTimer(room, seconds, `Pergunta ${room.quiz.questionIndex + 1}`);
    } else {
      this.stopTimer(room);
      room.activePhase = MomentPhase.REVEALED;
    }
  }

  async closeMoment(room: RoomRuntime, momentId: string) {
    if (room.activeMomentId !== momentId) return;
    this.stopTimer(room);
    room.activePhase = MomentPhase.CLOSED;
    await this.persistRoom(room);
    this.emitState(room);
    await this.emitMomentUpdated(room);
  }

  async approveAnswer(room: RoomRuntime, answerId: string, approved: boolean) {
    await prisma.answer.update({ where: { id: answerId }, data: { approved } });
    await this.emitResults(room);
  }

  /* ---------------------------------------------------------------- timer */

  startTimer(room: RoomRuntime, seconds: number, label: string) {
    this.stopTimer(room);
    const timer = {
      total: seconds,
      remaining: seconds,
      label,
      running: true,
      handle: null as NodeJS.Timeout | null,
    };
    room.timer = timer;
    this.nsp.to(room.code).emit('timer:tick', {
      remaining: timer.remaining,
      total: timer.total,
      label,
      running: true,
    });
    timer.handle = setInterval(() => {
      timer.remaining -= 1;
      if (timer.remaining <= 0) {
        timer.remaining = 0;
        timer.running = false;
        this.stopTimer(room);
      }
      this.nsp.to(room.code).emit('timer:tick', {
        remaining: timer.remaining,
        total: timer.total,
        label: timer.label,
        running: timer.running,
      });
    }, 1000);
  }

  stopTimer(room: RoomRuntime) {
    if (room.timer?.handle) clearInterval(room.timer.handle);
    if (room.timer) room.timer.running = false;
  }

  /* ----------------------------------------------------------- persistence */

  private async persistRoom(room: RoomRuntime) {
    await prisma.room.update({
      where: { id: room.roomId },
      data: {
        status: room.status,
        activeMomentId: room.activeMomentId,
        activePhase: room.activePhase,
      },
    });
  }

  async endRoom(room: RoomRuntime) {
    this.stopTimer(room);
    room.status = 'ENDED';
    room.activeMomentId = null;
    room.activePhase = null;
    await prisma.room.update({
      where: { id: room.roomId },
      data: { status: 'ENDED', endedAt: new Date(), activeMomentId: null, activePhase: null },
    });
    this.emitState(room);
  }

  /** Dispose all timers (used on server shutdown / tests). */
  dispose() {
    for (const room of this.rooms.values()) this.stopTimer(room);
    for (const handle of this.resultsTimers.values()) clearTimeout(handle);
    this.resultsTimers.clear();
    this.rooms.clear();
  }
}

function safeParse(value: string): Record<string, unknown> {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}
