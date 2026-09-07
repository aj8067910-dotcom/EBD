import type { FastifyInstance } from 'fastify';
import { dailyReadingController } from '../controllers/dailyReadingController.js';

export async function dailyReadingRoutes(app: FastifyInstance) {
  const auth = { preHandler: app.requireTeacher };

  // Public art (id-addressed) — the shareable image contains no private data,
  // and must be fetchable by the WhatsApp provider.
  app.get('/daily-readings/:id/art.svg', dailyReadingController.artSvg);
  app.get('/daily-readings/:id/art.png', dailyReadingController.artPng);

  // Teacher management.
  app.get('/daily-readings', auth, dailyReadingController.dashboard);
  app.post('/daily-readings', auth, dailyReadingController.create);
  app.get('/daily-readings/recipients', auth, dailyReadingController.recipients);
  app.get('/daily-readings/recipients/count', auth, dailyReadingController.recipientsCount);
  app.get('/daily-readings/:id', auth, dailyReadingController.get);
  app.put('/daily-readings/:id', auth, dailyReadingController.update);
  app.delete('/daily-readings/:id', auth, dailyReadingController.remove);
  app.post('/daily-readings/:id/publish', auth, dailyReadingController.publish);
  app.post('/daily-readings/:id/send', auth, dailyReadingController.send);
  app.get('/daily-readings/:id/send-status', auth, dailyReadingController.sendStatus);
}
