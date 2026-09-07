import type { FastifyInstance } from 'fastify';
import { bibleController } from '../controllers/bibleController.js';

/** Bible helper (public-domain translation) for the daily-reading editor. */
export async function bibleRoutes(app: FastifyInstance) {
  const auth = { preHandler: app.requireTeacher };
  app.get('/bible/books', auth, bibleController.books);
  app.get('/bible/passage', auth, bibleController.passage);
}
