import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { env } from '../env.js';
import { Errors } from '../errors.js';

export const AUTH_COOKIE = 'koinonia_token';
/** Teacher JWTs expire after 7 days (see PARTE 7 security requirements). */
export const JWT_EXPIRES_IN = '7d';

export interface TeacherTokenPayload {
  sub: string;
  email?: string;
  /** TEACHER | STUDENT. Absent on legacy email/password tokens (= TEACHER). */
  role?: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    teacherId?: string;
    userId?: string;
    userRole?: string;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: TeacherTokenPayload;
    user: TeacherTokenPayload;
  }
}

export async function registerAuth(app: FastifyInstance) {
  await app.register(fastifyCookie);
  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    cookie: {
      cookieName: AUTH_COOKIE,
      signed: false,
    },
    sign: { expiresIn: JWT_EXPIRES_IN },
  });

  /**
   * preHandler that requires a valid teacher JWT (from the httpOnly cookie or
   * an `Authorization: Bearer <token>` header). Populates `request.teacherId`.
   */
  app.decorate(
    'requireTeacher',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      let payload: TeacherTokenPayload;
      try {
        payload = await request.jwtVerify<TeacherTokenPayload>();
      } catch {
        throw Errors.unauthorized();
      }
      // Legacy tokens have no role and are teachers.
      if (payload.role && payload.role !== 'TEACHER') {
        throw Errors.forbidden('Acesso restrito a professores');
      }
      request.teacherId = payload.sub;
      request.userId = payload.sub;
      request.userRole = payload.role ?? 'TEACHER';
    },
  );

  // Any authenticated user (teacher or student) — for profile/preferences.
  app.decorate(
    'requireUser',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      try {
        const payload = await request.jwtVerify<TeacherTokenPayload>();
        request.userId = payload.sub;
        request.userRole = payload.role ?? 'TEACHER';
      } catch {
        throw Errors.unauthorized();
      }
    },
  );
}

declare module 'fastify' {
  interface FastifyInstance {
    requireTeacher: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
    requireUser: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/** Set the auth cookie (httpOnly) on the reply. */
export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}
