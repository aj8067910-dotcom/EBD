import type { FastifyInstance } from 'fastify';
import { preClassController } from '../controllers/preClassController.js';

export async function preClassRoutes(app: FastifyInstance) {
  // Public (token-guarded) pre-class endpoints.
  app.get('/lessons/:id/preclass', preClassController.getPublic);
  app.post('/lessons/:id/preclass', preClassController.submit);
  // Teacher-only aggregated summary.
  app.get(
    '/lessons/:id/preclass/summary',
    { preHandler: app.requireTeacher },
    preClassController.summary,
  );
}
