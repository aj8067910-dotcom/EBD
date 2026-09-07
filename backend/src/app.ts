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

  // Capture the raw JSON body (as a Buffer) so the WhatsApp webhook can verify
  // Meta's X-Hub-Signature-256 HMAC over the exact bytes received (B-10). The
  // parsed value is still the decoded JSON, so all other routes are unaffected.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      (req as unknown as { rawBody?: Buffer }).rawBody = body as Buffer;
      const text = (body as Buffer).toString('utf8');
      if (text.length === 0) {
        done(null, undefined);
        return;
      }
      try {
        done(null, JSON.parse(text));
      } catch (err) {
        (err as { statusCode?: number }).statusCode = 400;
        done(err as Error, undefined);
      }
    },
  );

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
