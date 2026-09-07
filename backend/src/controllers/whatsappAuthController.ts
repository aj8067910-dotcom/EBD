import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { whatsappAuthService, toPublicUser } from '../services/whatsappAuthService.js';
import { setAuthCookie } from '../plugins/auth.js';
import { Errors } from '../errors.js';

const numberSchema = z.object({ whatsappNumber: z.string().min(5).max(24) });
const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  whatsappNumber: z.string().min(5).max(24),
});
const verifySchema = z.object({
  whatsappNumber: z.string().min(5).max(24),
  code: z.string().regex(/^\d{6}$/, 'Código deve ter 6 dígitos'),
});

export const whatsappAuthController = {
  async request(request: FastifyRequest, reply: FastifyReply) {
    const { whatsappNumber } = numberSchema.parse(request.body);
    return reply.send(await whatsappAuthService.requestLogin(whatsappNumber));
  },

  async register(request: FastifyRequest, reply: FastifyReply) {
    const { name, whatsappNumber } = registerSchema.parse(request.body);
    return reply.status(201).send(await whatsappAuthService.register(name, whatsappNumber));
  },

  async verify(request: FastifyRequest, reply: FastifyReply) {
    const { whatsappNumber, code } = verifySchema.parse(request.body);
    const user = await whatsappAuthService.verify(whatsappNumber, code);
    const token = await reply.jwtSign({
      sub: user.id,
      role: user.role,
      email: user.email ?? undefined,
    });
    setAuthCookie(reply, token);
    return reply.send({ user: toPublicUser(user), token });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.userId) throw Errors.unauthorized();
    const user = await whatsappAuthService.me(request.userId);
    return reply.send({ user: toPublicUser(user) });
  },
};
