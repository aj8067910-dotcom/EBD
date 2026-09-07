import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { profileService } from '../services/profileService.js';
import { Errors } from '../errors.js';

const prefsSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  enabled: z.boolean().optional(),
  dailyReadingEnabled: z.boolean().optional(),
});
const numberSchema = z.object({ whatsappNumber: z.string().min(5).max(24) });
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/) });

function userId(request: FastifyRequest): string {
  if (!request.userId) throw Errors.unauthorized();
  return request.userId;
}

export const profileController = {
  async get(request: FastifyRequest, reply: FastifyReply) {
    return reply.send({ profile: await profileService.get(userId(request)) });
  },
  async updatePreferences(request: FastifyRequest, reply: FastifyReply) {
    const prefs = prefsSchema.parse(request.body);
    return reply.send({ profile: await profileService.updatePreferences(userId(request), prefs) });
  },
  async requestNumberChange(request: FastifyRequest, reply: FastifyReply) {
    const { whatsappNumber } = numberSchema.parse(request.body);
    return reply.send(await profileService.requestNumberChange(userId(request), whatsappNumber));
  },
  async confirmNumberChange(request: FastifyRequest, reply: FastifyReply) {
    const { code } = codeSchema.parse(request.body);
    return reply.send({
      profile: await profileService.confirmNumberChange(userId(request), code),
    });
  },
};
