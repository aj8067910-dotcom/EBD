import type { FastifyInstance } from 'fastify';
import { whatsappAuthController } from '../controllers/whatsappAuthController.js';

// Per-IP guard; the tight control is the per-number OTP limit in otpService.
const otpLimit = { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } };

export async function whatsappAuthRoutes(app: FastifyInstance) {
  app.post('/auth/whatsapp/request', otpLimit, whatsappAuthController.request);
  app.post('/auth/whatsapp/register', otpLimit, whatsappAuthController.register);
  app.post('/auth/whatsapp/verify', otpLimit, whatsappAuthController.verify);
  app.get(
    '/auth/whatsapp/me',
    { preHandler: app.requireUser },
    whatsappAuthController.me,
  );
}
