import type { FastifyInstance } from 'fastify';
import { webhookController } from '../controllers/webhookController.js';

export async function webhookRoutes(app: FastifyInstance) {
  app.get('/webhooks/whatsapp', webhookController.verify);
  app.post('/webhooks/whatsapp', webhookController.receive);
}
