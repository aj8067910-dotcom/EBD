import Fastify, { type FastifyInstance } from 'fastify';
import { corsOrigins } from './env.js';

/**
 * Build the Fastify application. Kept free of side effects (no listen) so it
 * can be imported by integration tests. HTTP routes and plugins are wired up
 * in later parts.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  const cors = await import('@fastify/cors');
  await app.register(cors.default, {
    origin: corsOrigins,
    credentials: true,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
