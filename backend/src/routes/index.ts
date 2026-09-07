import type { FastifyInstance } from 'fastify';
import { authRoutes } from './authRoutes.js';
import { lessonRoutes } from './lessonRoutes.js';
import { roomRoutes } from './roomRoutes.js';
import { preClassRoutes } from './preClassRoutes.js';
import { whatsappAuthRoutes } from './whatsappAuthRoutes.js';
import { dailyReadingRoutes } from './dailyReadingRoutes.js';
import { bibleRoutes } from './bibleRoutes.js';
import { profileRoutes } from './profileRoutes.js';
import { webhookRoutes } from './webhookRoutes.js';

/** Register all HTTP routes. Each group is an encapsulated plugin so its
 * hooks (e.g. requireTeacher) stay scoped to that group. */
export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes);
  await app.register(whatsappAuthRoutes);
  await app.register(lessonRoutes);
  await app.register(roomRoutes);
  await app.register(preClassRoutes);
  await app.register(dailyReadingRoutes);
  await app.register(bibleRoutes);
  await app.register(profileRoutes);
  await app.register(webhookRoutes);
}
