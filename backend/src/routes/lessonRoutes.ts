import type { FastifyInstance } from 'fastify';
import { lessonController } from '../controllers/lessonController.js';
import { momentController } from '../controllers/momentController.js';

export async function lessonRoutes(app: FastifyInstance) {
  // All lesson/moment management routes require an authenticated teacher.
  app.addHook('preHandler', app.requireTeacher);

  app.get('/lessons', lessonController.list);
  app.post('/lessons', lessonController.create);
  app.get('/lessons/:id', lessonController.get);
  app.put('/lessons/:id', lessonController.update);
  app.delete('/lessons/:id', lessonController.remove);
  app.post('/lessons/:id/duplicate', lessonController.duplicate);

  // Moments (nested under their lesson).
  app.post('/lessons/:id/moments', momentController.create);
  app.patch('/lessons/:id/moments/reorder', momentController.reorder);
  app.put('/moments/:id', momentController.update);
  app.delete('/moments/:id', momentController.remove);
}
