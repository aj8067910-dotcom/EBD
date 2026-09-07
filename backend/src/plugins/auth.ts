import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCookie from '@fastify/cookie';
import { env } from '../env.js';
import { prisma } from '../prisma.js';
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
   * Resolve the current user from the DB for a verified token. Authorization
   * decisions (isActive, role) must not trust a possibly-stale JWT payload:
   * a deactivated account or a changed role takes effect on the next request
   * (B-13), rather than lingering for up to the token's 7-day lifetime.
   */
  async function currentUser(request: FastifyRequest) {
    let payload: TeacherTokenPayload;
    try {
      payload = await request.jwtVerify<TeacherTokenPayload>();
    } catch {
      throw Errors.unauthorized();
    }
    const user = await prisma.teacher.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) {
      throw Errors.unauthorized('Sessão inválida');
    }
    return user;
  }

  /**
   * preHandler that requires a valid, active TEACHER (from the httpOnly cookie
   * or an `Authorization: Bearer <token>` header). Populates `request.teacherId`.
   */
  app.decorate(
    'requireTeacher',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await currentUser(request);
      // Authorize against the live DB role, not the token payload.
      if (user.role !== 'TEACHER') {
        throw Errors.forbidden('Acesso restrito a professores');
      }
      request.teacherId = user.id;
      request.userId = user.id;
      request.userRole = user.role;
    },
  );

  // Any authenticated, active user (teacher or student) — for profile/preferences.
  app.decorate(
    'requireUser',
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await currentUser(request);
      request.userId = user.id;
      request.userRole = user.role;
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

/**
 * Set the auth cookie. httpOnly (never readable by JS → XSS can't exfiltrate
 * it) and, in production, Secure so it only travels over HTTPS (B-11).
 */
export function setAuthCookie(reply: FastifyReply, token: string) {
  reply.setCookie(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** Clear the auth cookie (logout). */
export function clearAuthCookie(reply: FastifyReply) {
  reply.clearCookie(AUTH_COOKIE, { path: '/' });
}
