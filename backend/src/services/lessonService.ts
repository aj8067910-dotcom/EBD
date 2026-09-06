import { lessonRepo } from '../repositories/lessonRepo.js';
import { momentRepo } from '../repositories/momentRepo.js';
import { toMomentDTO } from '../lib/moment.js';
import { Errors } from '../errors.js';

async function getOwnedLesson(id: string, teacherId: string) {
  const lesson = await lessonRepo.findById(id);
  if (!lesson) throw Errors.notFound('Lição não encontrada');
  if (lesson.teacherId !== teacherId) throw Errors.forbidden();
  return lesson;
}

export const lessonService = {
  async list(teacherId: string) {
    const lessons = await lessonRepo.listByTeacher(teacherId);
    return lessons.map((l) => ({
      id: l.id,
      title: l.title,
      bibleReference: l.bibleReference,
      date: l.date,
      notes: l.notes,
      preClassToken: l.preClassToken,
      momentCount: l._count.moments,
      createdAt: l.createdAt,
    }));
  },

  async get(id: string, teacherId: string) {
    const lesson = await getOwnedLesson(id, teacherId);
    return this.toDTO(lesson);
  },

  async create(
    teacherId: string,
    input: {
      title: string;
      bibleReference: string;
      date?: string | null;
      notes?: string | null;
    },
  ) {
    const lesson = await lessonRepo.create({
      teacherId,
      title: input.title,
      bibleReference: input.bibleReference,
      date: input.date ? new Date(input.date) : null,
      notes: input.notes ?? null,
    });
    return { ...lesson, moments: [] };
  },

  async update(
    id: string,
    teacherId: string,
    input: {
      title?: string;
      bibleReference?: string;
      date?: string | null;
      notes?: string | null;
    },
  ) {
    await getOwnedLesson(id, teacherId);
    const updated = await lessonRepo.update(id, {
      title: input.title,
      bibleReference: input.bibleReference,
      date: input.date === undefined ? undefined : input.date ? new Date(input.date) : null,
      notes: input.notes,
    });
    return updated;
  },

  async remove(id: string, teacherId: string) {
    await getOwnedLesson(id, teacherId);
    await lessonRepo.delete(id);
    return { deleted: true };
  },

  /** Duplicate a lesson (with all its moments) for reuse in another class. */
  async duplicate(id: string, teacherId: string) {
    const source = await getOwnedLesson(id, teacherId);
    const copy = await lessonRepo.create({
      teacherId,
      title: `${source.title} (cópia)`,
      bibleReference: source.bibleReference,
      date: null,
      notes: source.notes,
    });
    for (const m of source.moments) {
      await momentRepo.create({
        lessonId: copy.id,
        order: m.order,
        type: m.type,
        title: m.title,
        config: m.config,
        correctOptionIds: m.correctOptionIds,
        points: m.points,
        isPreClass: m.isPreClass,
      });
    }
    return this.get(copy.id, teacherId);
  },

  toDTO(lesson: {
    id: string;
    title: string;
    bibleReference: string;
    date: Date | null;
    notes: string | null;
    preClassToken: string;
    teacherId: string;
    createdAt: Date;
    moments: Parameters<typeof toMomentDTO>[0][];
  }) {
    return {
      id: lesson.id,
      title: lesson.title,
      bibleReference: lesson.bibleReference,
      date: lesson.date,
      notes: lesson.notes,
      preClassToken: lesson.preClassToken,
      createdAt: lesson.createdAt,
      moments: lesson.moments.map(toMomentDTO),
    };
  },
};
