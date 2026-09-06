import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { nicknameSchema } from '@koinonia/shared';
import { preClassService } from '../services/preClassService.js';
import { Errors } from '../errors.js';

const idParams = z.object({ id: z.string().min(1) });
const tokenQuery = z.object({ token: z.string().min(1) });
const submitSchema = z.object({
  nickname: nicknameSchema,
  momentId: z.string().min(1),
  payload: z.unknown(),
});

function teacherId(request: FastifyRequest): string {
  if (!request.teacherId) throw Errors.unauthorized();
  return request.teacherId;
}

export const preClassController = {
  async getPublic(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const { token } = tokenQuery.parse(request.query);
    return reply.send(await preClassService.getPublic(id, token));
  },

  async submit(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const { token } = tokenQuery.parse(request.query);
    const input = submitSchema.parse(request.body);
    return reply.status(201).send(await preClassService.submit(id, token, input));
  },

  async summary(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send(await preClassService.summary(id, teacherId(request)));
  },
};
