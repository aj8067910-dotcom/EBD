import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { dailyReadingService } from '../services/dailyReadingService.js';
import { dailyReadingImageService } from '../services/dailyReadingImage/DailyReadingImageService.js';
import {
  whatsappMessageService,
  type Audience,
} from '../services/whatsappMessageService.js';
import { Errors } from '../errors.js';

const dateString = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Data inválida');

const readingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  verse: z.string().trim().min(1).max(500),
  reference: z.string().trim().min(1).max(100),
  message: z.string().trim().max(1000).nullish(),
  readingDate: dateString,
  scheduledAt: z.string().datetime().nullish(),
});

const sendSchema = z.object({
  audience: z.enum(['ALL', 'TEACHERS', 'STUDENTS', 'SELECTION']),
  userIds: z.array(z.string().min(1)).optional(),
});

const idParams = z.object({ id: z.string().min(1) });

function teacherId(request: FastifyRequest): string {
  if (!request.teacherId) throw Errors.unauthorized();
  return request.teacherId;
}

export const dailyReadingController = {
  async dashboard(request: FastifyRequest, reply: FastifyReply) {
    return reply.send(await dailyReadingService.dashboard(teacherId(request)));
  },

  async create(request: FastifyRequest, reply: FastifyReply) {
    const input = readingSchema.parse(request.body);
    return reply.status(201).send({
      reading: await dailyReadingService.create(teacherId(request), input),
    });
  },

  async get(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({ reading: await dailyReadingService.get(id, teacherId(request)) });
  },

  async update(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const input = readingSchema.partial().parse(request.body);
    return reply.send({
      reading: await dailyReadingService.update(id, teacherId(request), input),
    });
  },

  async remove(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send(await dailyReadingService.remove(id, teacherId(request)));
  },

  async publish(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    return reply.send({
      reading: await dailyReadingService.publish(id, teacherId(request)),
    });
  },

  /** Public art (id-addressed): the shareable image, no private data. */
  async artSvg(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const input = await dailyReadingService.getArtInput(id);
    return reply
      .header('Content-Type', 'image/svg+xml; charset=utf-8')
      .send(dailyReadingImageService.buildSvg(input));
  },

  async artPng(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const input = await dailyReadingService.getArtInput(id);
    const png = await dailyReadingImageService.toPng(input);
    return reply
      .header('Content-Type', 'image/png')
      .header('Content-Disposition', `inline; filename="leitura-${id}.png"`)
      .send(png);
  },

  async send(request: FastifyRequest, reply: FastifyReply) {
    const tId = teacherId(request);
    const { id } = idParams.parse(request.params);
    const { audience, userIds } = sendSchema.parse(request.body);
    const reading = await dailyReadingService.getRow(id, tId);

    const aud: Audience =
      audience === 'SELECTION'
        ? { kind: 'SELECTION', userIds: userIds ?? [] }
        : { kind: audience };
    const users = await whatsappMessageService.resolveRecipients(aud);

    // Fire-and-forget: never block the UI on delivery.
    void whatsappMessageService
      .dispatch(reading, users)
      .then(() => dailyReadingService.markSent(id))
      .catch((e) => console.error('[daily-reading send]', e));

    return reply.status(202).send({ recipientCount: users.length });
  },

  async sendStatus(request: FastifyRequest, reply: FastifyReply) {
    teacherId(request);
    const { id } = idParams.parse(request.params);
    return reply.send(await whatsappMessageService.status(id));
  },

  /** Count of active users who could receive readings (for the dashboard). */
  async recipientsCount(request: FastifyRequest, reply: FastifyReply) {
    teacherId(request);
    const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
    const teachers = users.filter((u) => u.role === 'TEACHER').length;
    return reply.send({
      total: users.length,
      teachers,
      students: users.length - teachers,
    });
  },

  /** List of active recipients (masked) for individual selection. */
  async recipients(request: FastifyRequest, reply: FastifyReply) {
    teacherId(request);
    const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
    return reply.send({
      users: users.map((u) => ({ id: u.id, name: u.name, role: u.role })),
    });
  },
};
