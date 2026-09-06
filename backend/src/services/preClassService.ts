import { submitAnswerSchema, type MomentType } from '@koinonia/shared';
import { lessonRepo } from '../repositories/lessonRepo.js';
import { preClassRepo } from '../repositories/preClassRepo.js';
import { toMomentDTO } from '../lib/moment.js';
import { Errors } from '../errors.js';

async function resolveByToken(lessonId: string, token: string) {
  const lesson = await lessonRepo.findById(lessonId);
  if (!lesson || lesson.preClassToken !== token) {
    throw Errors.notFound('Link de pré-aula inválido');
  }
  return lesson;
}

export const preClassService = {
  /** Public: list the pre-class moments for a lesson (no correct answers). */
  async getPublic(lessonId: string, token: string) {
    const lesson = await resolveByToken(lessonId, token);
    const moments = lesson.moments
      .filter((m) => m.isPreClass)
      .map(toMomentDTO)
      .map((m) => ({ ...m, correctOptionIds: null }));
    return {
      lessonId: lesson.id,
      lessonTitle: lesson.title,
      bibleReference: lesson.bibleReference,
      moments,
    };
  },

  /** Public: submit a pre-class response. */
  async submit(
    lessonId: string,
    token: string,
    input: { nickname: string; momentId: string; payload?: unknown },
  ) {
    const lesson = await resolveByToken(lessonId, token);
    const moment = lesson.moments.find(
      (m) => m.id === input.momentId && m.isPreClass,
    );
    if (!moment) throw Errors.notFound('Momento de pré-aula não encontrado');

    const parsed = submitAnswerSchema.safeParse(input.payload);
    if (!parsed.success || parsed.data.type !== (moment.type as MomentType)) {
      throw Errors.validation('Resposta inválida para este momento');
    }

    const response = await preClassRepo.create({
      lessonId,
      nickname: input.nickname.trim().slice(0, 20),
      momentId: input.momentId,
      payload: JSON.stringify(parsed.data),
    });
    return { id: response.id };
  },

  /** Teacher: aggregate responses and highlight the most-chosen wrong options. */
  async summary(lessonId: string, teacherId: string) {
    const lesson = await lessonRepo.findById(lessonId);
    if (!lesson) throw Errors.notFound('Lição não encontrada');
    if (lesson.teacherId !== teacherId) throw Errors.forbidden();

    const responses = await preClassRepo.listByLesson(lessonId);
    const preClassMoments = lesson.moments.filter((m) => m.isPreClass).map(toMomentDTO);

    const byMoment = new Map<string, unknown[]>();
    for (const r of responses) {
      const list = byMoment.get(r.momentId) ?? [];
      try {
        list.push(JSON.parse(r.payload));
      } catch {
        // skip malformed
      }
      byMoment.set(r.momentId, list);
    }

    const moments = preClassMoments.map((m) => {
      const payloads = byMoment.get(m.id) ?? [];
      const base = {
        id: m.id,
        type: m.type,
        title: m.title,
        responseCount: payloads.length,
      };

      if (m.type === 'POLL' || m.type === 'PEER_INSTRUCTION') {
        const counts = new Map<string, number>();
        for (const p of payloads as { optionIds?: string[] }[]) {
          for (const id of p.optionIds ?? []) {
            counts.set(id, (counts.get(id) ?? 0) + 1);
          }
        }
        const correct = new Set(m.correctOptionIds ?? []);
        const tallies = [...counts.entries()].map(([optionId, count]) => ({
          optionId,
          count,
          correct: correct.has(optionId),
        }));
        const wrong = tallies
          .filter((t) => correct.size > 0 && !t.correct)
          .sort((a, b) => b.count - a.count);
        return { ...base, tallies, topWrongOptions: wrong.slice(0, 3) };
      }

      // Free-text / word answers: list them.
      const texts = (payloads as { text?: string; word?: string }[]).map(
        (p) => p.text ?? p.word ?? '',
      );
      return { ...base, responses: texts };
    });

    return { lessonId, lessonTitle: lesson.title, moments };
  },
};
