import type { PublicRoomInfo } from '@koinonia/shared';
import { roomRepo } from '../repositories/roomRepo.js';
import { lessonRepo } from '../repositories/lessonRepo.js';
import { prisma } from '../prisma.js';
import { toMomentDTO } from '../lib/moment.js';
import { generateRoomCode } from '../lib/roomCode.js';
import { Errors } from '../errors.js';

export const roomService = {
  async create(teacherId: string, lessonId: string) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw Errors.notFound('Lição não encontrada');
    if (lesson.teacherId !== teacherId) throw Errors.forbidden();

    // Generate a unique code, retrying on the (rare) collision.
    let code = generateRoomCode();
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const clash = await roomRepo.existsByCode(code);
      if (!clash) break;
      code = generateRoomCode();
    }

    const room = await roomRepo.create({ code, lessonId, teacherId });
    return {
      id: room.id,
      code: room.code,
      status: room.status,
      lessonId: room.lessonId,
      createdAt: room.createdAt,
    };
  },

  /** Teacher-only detailed view: room + lesson (with moments) + teams. */
  async getForTeacher(code: string, teacherId: string) {
    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        lesson: { include: { moments: { orderBy: { order: 'asc' } } } },
        teams: { orderBy: { score: 'desc' } },
      },
    });
    if (!room) throw Errors.notFound('Sala não encontrada');
    if (room.teacherId !== teacherId) throw Errors.forbidden();
    return {
      room: {
        id: room.id,
        code: room.code,
        status: room.status,
        activeMomentId: room.activeMomentId,
        activePhase: room.activePhase,
        createdAt: room.createdAt,
      },
      lesson: {
        id: room.lesson.id,
        title: room.lesson.title,
        bibleReference: room.lesson.bibleReference,
        moments: room.lesson.moments.map(toMomentDTO),
      },
      teams: room.teams.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        score: t.score,
      })),
    };
  },

  async getPublic(code: string): Promise<PublicRoomInfo> {
    const room = await roomRepo.findByCode(code);
    if (!room) {
      return { exists: false, status: null, lessonTitle: null, teamsEnabled: false };
    }
    return {
      exists: true,
      status: room.status as PublicRoomInfo['status'],
      lessonTitle: room.lesson.title,
      teamsEnabled: room.teams.length > 0,
    };
  },

  async end(code: string, teacherId: string) {
    const room = await roomRepo.findByCode(code);
    if (!room) throw Errors.notFound('Sala não encontrada');
    if (room.teacherId !== teacherId) throw Errors.forbidden();
    const ended = await roomRepo.end(room.id);
    return { id: ended.id, code: ended.code, status: ended.status, endedAt: ended.endedAt };
  },
};
