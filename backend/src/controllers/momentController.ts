import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createMomentSchema } from '@koinonia/shared';
import { momentService } from '../services/momentService.js';
import { Errors } from '../errors.js';

const lessonIdParams = z.object({ id: z.string().min(1) });
const momentIdParams = z.object({ id: z.string().min(1) });
const reorderSchema = z.object({ orderedIds: z.array(z.string().min(1)).min(1) });

function teacherId(request: FastifyRequest): string {
  if (!request.teacherId) throw Errors.unauthorized();
  return request.teacherId;
}

export const momentController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const { id: lessonId } = lessonIdParams.parse(request.params);
    const dto = createMomentSchema.parse(request.body);
    const moment = await momentService.create(lessonId, teacherId(request), dto);
    return reply.status(201).send({ moment });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = momentIdParams.parse(request.params);
    const dto = createMomentSchema.parse(request.body);
    const moment = await momentService.update(id, teacherId(request), dto);
    return reply.send({ moment });
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = momentIdParams.parse(request.params);
    return reply.send(await momentService.remove(id, teacherId(request)));
  },

  async reorder(request: FastifyRequest, reply: FastifyReply) {
    const { id: lessonId } = lessonIdParams.parse(request.params);
    const { orderedIds } = reorderSchema.parse(request.body);
    const moments = await momentService.reorder(
      lessonId,
      teacherId(request),
      orderedIds,
    );
    return reply.send({ moments });
  },
};
