import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bibleService } from '../services/bibleService.js';

const passageQuery = z.object({
  abbrev: z.string().min(1),
  chapter: z.coerce.number().int().positive(),
  verseStart: z.coerce.number().int().positive(),
  verseEnd: z.coerce.number().int().positive().optional(),
});

export const bibleController = {
  /** Canonical book list with chapter/verse counts (for the pickers). */
  async books(_req: FastifyRequest, reply: FastifyReply) {
    return reply.send({ books: bibleService.books });
  },

  /** Public-domain passage text for a book/chapter/verse selection. */
  async passage(req: FastifyRequest, reply: FastifyReply) {
    const q = passageQuery.parse(req.query);
    const result = await bibleService.passage(q);
    return reply.send(result);
  },
};
