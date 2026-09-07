import type { FastifyInstance } from 'fastify';
import { profileController } from '../controllers/profileController.js';

export async function profileRoutes(app: FastifyInstance) {
  app.addHook('preHandler', app.requireUser);

  app.get('/profile', profileController.get);
  app.put('/profile/preferences', profileController.updatePreferences);
  app.post('/profile/whatsapp/request-change', profileController.requestNumberChange);
  app.post('/profile/whatsapp/confirm-change', profileController.confirmNumberChange);
}
