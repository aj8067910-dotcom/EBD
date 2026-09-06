import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';

/**
 * Centralised error handler. Every error leaves the API as
 * `{ error: { code, message } }` with an appropriate HTTP status.
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .send({ error: { code: error.code, message: error.message } });
    }

    if (error instanceof ZodError) {
      const first = error.issues[0];
      const message = first
        ? `${first.path.join('.') || 'campo'}: ${first.message}`
        : 'Dados inválidos';
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', message } });
    }

    // Fastify 5 types the error handler param as unknown; narrow to read
    // the HTTP status set by plugins (rate-limit, JWT, etc.).
    const statusCode = (error as { statusCode?: number }).statusCode;

    // Fastify rate-limit sets statusCode 429.
    if (statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMITED',
          message: 'Muitas requisições, tente novamente em instantes.',
        },
      });
    }

    // JWT / auth plugin errors.
    if (statusCode === 401) {
      return reply
        .status(401)
        .send({ error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } });
    }

    _request.log.error(error);
    return reply.status(statusCode ?? 500).send({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Erro interno do servidor',
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply
      .status(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
  });
}
