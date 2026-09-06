import type { FastifyInstance } from 'fastify';
import { roomController } from '../controllers/roomController.js';

export async function roomRoutes(app: FastifyInstance) {
  const auth = { preHandler: app.requireTeacher };

  app.post('/rooms', auth, roomController.create);
  // Public: used by the student join screen (no auth).
  app.get('/rooms/:code/public', roomController.getPublic);
  app.post('/rooms/:code/end', auth, roomController.end);
  app.get('/rooms/:id/report', auth, roomController.report);
  app.get('/rooms/:id/report.csv', auth, roomController.reportCsv);
}
