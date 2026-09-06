import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { createRoomSchema, roomCodeSchema } from '@koinonia/shared';
import { roomService } from '../services/roomService.js';
import { reportService } from '../services/reportService.js';
import { Errors } from '../errors.js';

const codeParams = z.object({ code: roomCodeSchema });
const idParams = z.object({ id: z.string().min(1) });

function teacherId(request: FastifyRequest): string {
  if (!request.teacherId) throw Errors.unauthorized();
  return request.teacherId;
}

export const roomController = {
  async create(request: FastifyRequest, reply: FastifyReply) {
    const { lessonId } = createRoomSchema.parse(request.body);
    const room = await roomService.create(teacherId(request), lessonId);
    return reply.status(201).send({ room });
  },

  async getPublic(request: FastifyRequest, reply: FastifyReply) {
    const { code } = codeParams.parse(request.params);
    return reply.send(await roomService.getPublic(code));
  },

  async detail(request: FastifyRequest, reply: FastifyReply) {
    const { code } = codeParams.parse(request.params);
    return reply.send(await roomService.getForTeacher(code, teacherId(request)));
  },

  async end(request: FastifyRequest, reply: FastifyReply) {
    const { code } = codeParams.parse(request.params);
    return reply.send({ room: await roomService.end(code, teacherId(request)) });
  },

  async report(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const report = await reportService.buildReport(id, teacherId(request));
    return reply.send({ report });
  },

  async reportCsv(request: FastifyRequest, reply: FastifyReply) {
    const { id } = idParams.parse(request.params);
    const report = await reportService.buildReport(id, teacherId(request));
    const csv = reportService.toCsv(report);
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header(
        'Content-Disposition',
        `attachment; filename="relatorio-${report.room.code}.csv"`,
      )
      .send(csv);
  },
};
