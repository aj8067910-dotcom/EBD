import Fastify, { type FastifyInstance } from 'fastify';
import { corsOrigins } from './env.js';
import { registerErrorHandler } from './plugins/errorHandler.js';
import { registerAuth } from './plugins/auth.js';
import { registerRoutes } from './routes/index.js';

/**
 * Build the Fastify application. Kept free of side effects (no listen) so it
 * can be imported by integration tests.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  registerErrorHandler(app);

  const helmet = await import('@fastify/helmet');
  await app.register(helmet.default, {
    // The backend serves a JSON API + Socket.IO, not HTML, so CSP is unneeded
    // and would only complicate the separate frontend origin.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  const cors = await import('@fastify/cors');
  await app.register(cors.default, {
    origin: corsOrigins,
    credentials: true,
  });

  const rateLimit = await import('@fastify/rate-limit');
  await app.register(rateLimit.default, {
    // Per-route opt-in (login, and later socket join / wall post).
    global: false,
    max: 100,
    timeWindow: '1 minute',
  });

  await registerAuth(app);

  app.get('/health', async () => ({ status: 'ok' }));

  await registerRoutes(app);

  return app;
}
