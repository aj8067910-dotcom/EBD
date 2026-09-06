import type { CreateMomentDTO } from '@koinonia/shared';
import { momentRepo } from '../repositories/momentRepo.js';
import { lessonRepo } from '../repositories/lessonRepo.js';
import { toMomentDTO, validateMomentConfig } from '../lib/moment.js';
import { Errors } from '../errors.js';

async function assertLessonOwner(lessonId: string, teacherId: string) {
  const lesson = await lessonRepo.findById(lessonId);
  if (!lesson) throw Errors.notFound('Lição não encontrada');
  if (lesson.teacherId !== teacherId) throw Errors.forbidden();
  return lesson;
}

async function assertMomentOwner(momentId: string, teacherId: string) {
  const moment = await momentRepo.findById(momentId);
  if (!moment) throw Errors.notFound('Momento não encontrado');
  await assertLessonOwner(moment.lessonId, teacherId);
  return moment;
}

function correctIdsFrom(dto: CreateMomentDTO): string | null {
  if (dto.type === 'PEER_INSTRUCTION' && dto.correctOptionIds) {
    return JSON.stringify(dto.correctOptionIds);
  }
  return null;
}

export const momentService = {
  async create(lessonId: string, teacherId: string, dto: CreateMomentDTO) {
    await assertLessonOwner(lessonId, teacherId);
    const config = validateMomentConfig(dto.type, dto.config);

    let order = dto.order;
    if (order === undefined) {
      const agg = await momentRepo.maxOrder(lessonId);
      order = (agg._max.order ?? -1) + 1;
    }

    const created = await momentRepo.create({
      lessonId,
      order,
      type: dto.type,
      title: dto.title,
      config: JSON.stringify(config),
      correctOptionIds: correctIdsFrom(dto),
      points: dto.points,
      isPreClass: dto.isPreClass,
    });
    return toMomentDTO(created);
  },

  async update(momentId: string, teacherId: string, dto: CreateMomentDTO) {
    const existing = await assertMomentOwner(momentId, teacherId);
    const config = validateMomentConfig(dto.type, dto.config);
    const updated = await momentRepo.update(momentId, {
      order: dto.order ?? existing.order,
      type: dto.type,
      title: dto.title,
      config: JSON.stringify(config),
      correctOptionIds: correctIdsFrom(dto),
      points: dto.points,
      isPreClass: dto.isPreClass,
    });
    return toMomentDTO(updated);
  },

  async remove(momentId: string, teacherId: string) {
    await assertMomentOwner(momentId, teacherId);
    await momentRepo.delete(momentId);
    return { deleted: true };
  },

  /** Reorder all moments of a lesson from an ordered array of ids. */
  async reorder(lessonId: string, teacherId: string, orderedIds: string[]) {
    await assertLessonOwner(lessonId, teacherId);
    const moments = await momentRepo.listByLesson(lessonId);
    const known = new Set(moments.map((m) => m.id));
    if (
      orderedIds.length !== moments.length ||
      !orderedIds.every((id) => known.has(id))
    ) {
      throw Errors.validation(
        'A lista de reordenação deve conter exatamente os momentos da lição',
      );
    }
    await momentRepo.reorder(orderedIds.map((id, index) => ({ id, order: index })));
    const refreshed = await momentRepo.listByLesson(lessonId);
    return refreshed.map(toMomentDTO);
  },
};
