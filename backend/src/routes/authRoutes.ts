import type { FastifyInstance } from 'fastify';
import { authController } from '../controllers/authController.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', authController.register);

  app.post(
    '/auth/login',
    {
      // Rate limit login attempts: 10 per minute per IP.
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    authController.login,
  );

  app.get(
    '/auth/me',
    { preHandler: app.requireTeacher },
    authController.me,
  );

  app.post('/auth/logout', authController.logout);
}
