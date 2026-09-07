import type { DailyReading } from '@prisma/client';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { Errors } from '../errors.js';

export interface DailyReadingInput {
  title: string;
  verse: string;
  reference: string;
  message?: string | null;
  readingDate: string;
  scheduledAt?: string | null;
}

function artUrl(id: string): string {
  return `${env.PUBLIC_BASE_URL}/daily-readings/${id}/art.png`;
}

export function toReadingDTO(r: DailyReading) {
  return {
    id: r.id,
    title: r.title,
    verse: r.verse,
    reference: r.reference,
    message: r.message,
    readingDate: r.readingDate.toISOString(),
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    imageUrl: r.imageUrl,
    status: r.status,
    publishedAt: r.publishedAt?.toISOString() ?? null,
    sentAt: r.sentAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

async function getOwned(id: string, teacherId: string) {
  const reading = await prisma.dailyReading.findUnique({ where: { id } });
  if (!reading) throw Errors.notFound('Leitura não encontrada');
  if (reading.teacherId !== teacherId) throw Errors.forbidden();
  return reading;
}

export const dailyReadingService = {
  async create(teacherId: string, input: DailyReadingInput) {
    const created = await prisma.dailyReading.create({
      data: {
        teacherId,
        title: input.title.trim(),
        verse: input.verse.trim(),
        reference: input.reference.trim(),
        message: input.message?.trim() || null,
        readingDate: new Date(input.readingDate),
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
      },
    });
    const withArt = await prisma.dailyReading.update({
      where: { id: created.id },
      data: { imageUrl: artUrl(created.id) },
    });
    return toReadingDTO(withArt);
  },

  async update(id: string, teacherId: string, input: Partial<DailyReadingInput>) {
    await getOwned(id, teacherId);
    const updated = await prisma.dailyReading.update({
      where: { id },
      data: {
        title: input.title?.trim(),
        verse: input.verse?.trim(),
        reference: input.reference?.trim(),
        message: input.message === undefined ? undefined : input.message?.trim() || null,
        readingDate: input.readingDate ? new Date(input.readingDate) : undefined,
        scheduledAt:
          input.scheduledAt === undefined
            ? undefined
            : input.scheduledAt
              ? new Date(input.scheduledAt)
              : null,
      },
    });
    return toReadingDTO(updated);
  },

  async remove(id: string, teacherId: string) {
    await getOwned(id, teacherId);
    await prisma.dailyReading.delete({ where: { id } });
    return { deleted: true };
  },

  async get(id: string, teacherId: string) {
    return toReadingDTO(await getOwned(id, teacherId));
  },

  /** Raw row (for teacher-scoped operations). */
  getOwnedRow: getOwned,

  /** Public art input by id (the art contains only the reading content). */
  async getArtInput(id: string) {
    const reading = await prisma.dailyReading.findUnique({ where: { id } });
    if (!reading) throw Errors.notFound('Leitura não encontrada');
    return {
      title: reading.title,
      verse: reading.verse,
      reference: reading.reference,
      readingDate: reading.readingDate,
    };
  },

  getRow: getOwned,

  async publish(id: string, teacherId: string) {
    await getOwned(id, teacherId);
    const updated = await prisma.dailyReading.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    return toReadingDTO(updated);
  },

  async markSent(id: string) {
    await prisma.dailyReading.update({
      where: { id },
      data: { status: 'SENT', sentAt: new Date() },
    });
  },

  /** Dashboard: today, upcoming and past readings with delivery counts. */
  async dashboard(teacherId: string) {
    const readings = await prisma.dailyReading.findMany({
      where: { teacherId },
      orderBy: { readingDate: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000);

    const withCounts = await Promise.all(
      readings.map(async (r) => {
        const sent = await prisma.whatsAppMessage.count({
          where: { dailyReadingId: r.id, status: 'SENT' },
        });
        const failed = await prisma.whatsAppMessage.count({
          where: { dailyReadingId: r.id, status: 'FAILED' },
        });
        return { ...toReadingDTO(r), sentCount: sent, failedCount: failed };
      }),
    );

    return {
      today: withCounts.filter(
        (r) =>
          new Date(r.readingDate) >= startToday && new Date(r.readingDate) < endToday,
      ),
      upcoming: withCounts.filter((r) => new Date(r.readingDate) >= endToday),
      past: withCounts.filter((r) => new Date(r.readingDate) < startToday),
    };
  },
};
