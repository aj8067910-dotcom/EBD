import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/authService.js';
import { setAuthCookie } from '../plugins/auth.js';
import { Errors } from '../errors.js';

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

async function issueToken(
  reply: FastifyReply,
  teacher: { id: string; email: string },
) {
  const token = await reply.jwtSign({ sub: teacher.id, email: teacher.email });
  setAuthCookie(reply, token);
  return token;
}

export const authController = {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const input = registerSchema.parse(request.body);
    const teacher = await authService.register(input);
    const token = await issueToken(reply, teacher);
    return reply.status(201).send({ teacher, token });
  },

  async login(request: FastifyRequest, reply: FastifyReply) {
    const input = loginSchema.parse(request.body);
    const teacher = await authService.login(input);
    const token = await issueToken(reply, teacher);
    return reply.send({ teacher, token });
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    if (!request.teacherId) throw Errors.unauthorized();
    const teacher = await authService.me(request.teacherId);
    return reply.send({ teacher });
  },
};
