import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { lessonService } from '../services/lessonService.js';
import { Errors } from '../errors.js';

const lessonBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  bibleReference: z.string().trim().min(1).max(160),
  date: z.string().datetime().nullable().optional(),
  notes: z.string().max(4000).nullable().optional(),
});

const lessonUpdateSchema = lessonBodySchema.partial();
const idParams = z.object({ id: z.string().min(1) });

function teacherId(request: FastifyRequest): string {
  if (!request.teacherId) throw Errors.unauthorized();
  return request.teacherId;
}

export const lessonController = {
  async list(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ lessons: await lessonService.list(teacherId(request)) });
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ lesson: await lessonService.get(id, teacherId(request)) });
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = lessonBodySchema.parse(request.body);
    const lesson = await lessonService.create(teacherId(request), input);
    return reply.status(201).send({ lesson });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const input = lessonUpdateSchema.parse(request.body);
    const lesson = await lessonService.update(id, teacherId(request), input);
    return reply.send({ lesson });
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send(await lessonService.remove(id, teacherId(request)));
  },

  async duplicate(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const lesson = await lessonService.duplicate(id, teacherId(request));
    return reply.status(201).send({ lesson });
  },
};
