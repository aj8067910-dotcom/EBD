import type { DailyReading } from '@prisma/client';
import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { Errors } from '../errors.js';
import { parseReadingDate, readingDateISO, todayInTimeZone } from '../lib/date.js';
import { APP_TIMEZONE } from '../lib/constants.js';

export interface DailyReadingInput {
  title: string;
  verse: string;
  reference: string;
  message?: string | null;
  readingDate: string;
  scheduledAt?: string | null;
}

/** Deterministic public art URL derived from the configured base URL. */
// A reading whose delivery has begun/finished: its art is frozen (B-09) and it
// must not be hard-deleted (B-20: preserve the delivery audit trail).
const LOCKED_STATUSES = new Set(['SENDING', 'SENT', 'PARTIALLY_SENT']);

function artUrl(id: string): string {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, '');
  return `${base}/daily-readings/${id}/art.png`;
}

export function toReadingDTO(r: DailyReading) {
  return {
    id: r.id,
    title: r.title,
    verse: r.verse,
    reference: r.reference,
    message: r.message,
    // Calendar day (YYYY-MM-DD), timezone-independent (B-07).
    readingDate: readingDateISO(r.readingDate),
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
        readingDate: parseReadingDate(input.readingDate),
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
    const reading = await getOwned(id, teacherId);

    // B-09: once a reading has started/finished sending, its art (title, verse,
    // reference, date) is immutable — a delivered message must never point at a
    // URL whose rendered content can change afterwards.
    if (LOCKED_STATUSES.has(reading.status)) {
      const changesArt =
        (input.title !== undefined && input.title.trim() !== reading.title) ||
        (input.verse !== undefined && input.verse.trim() !== reading.verse) ||
        (input.reference !== undefined && input.reference.trim() !== reading.reference) ||
        (input.readingDate !== undefined &&
          readingDateISO(parseReadingDate(input.readingDate)) !==
            readingDateISO(reading.readingDate));
      if (changesArt) {
        throw Errors.conflict(
          'Esta leitura já foi enviada; o conteúdo da arte não pode ser alterado.',
        );
      }
    }

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
    const reading = await getOwned(id, teacherId);
    // B-20: never hard-delete a reading that has been (partly) sent — deleting
    // would cascade-remove the WhatsAppMessage audit trail.
    if (LOCKED_STATUSES.has(reading.status)) {
      throw Errors.conflict(
        'Esta leitura já foi enviada e não pode ser excluída (histórico de envios preservado).',
      );
    }
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

  /** Flip a reading to SENDING just before a dispatch begins. */
  async markSending(id: string) {
    await prisma.dailyReading.update({
      where: { id },
      data: { status: 'SENDING' },
    });
  },

  /**
   * Recompute the aggregate reading status from its per-recipient
   * WhatsAppMessage rows (B-01). Never marks SENT while any delivery failed
   * or is still pending.
   *
   *   pending > 0                      -> SENDING (still processing)
   *   total === 0 (no recipients)      -> SENT (nothing to deliver)
   *   failed === 0 && sent  > 0        -> SENT (all delivered)
   *   sent  === 0 && failed > 0        -> FAILED (none delivered)
   *   sent  > 0  && failed > 0         -> PARTIALLY_SENT
   */
  async finalizeStatus(id: string) {
    const [sent, failed, pending] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { dailyReadingId: id, status: 'SENT' } }),
      prisma.whatsAppMessage.count({ where: { dailyReadingId: id, status: 'FAILED' } }),
      // In-flight rows (PENDING or transiently claimed SENDING) count as pending.
      prisma.whatsAppMessage.count({
        where: { dailyReadingId: id, status: { in: ['PENDING', 'SENDING'] } },
      }),
    ]);
    const total = sent + failed + pending;

    let status: string;
    if (pending > 0) status = 'SENDING';
    else if (total === 0) status = 'SENT';
    else if (failed === 0) status = 'SENT';
    else if (sent === 0) status = 'FAILED';
    else status = 'PARTIALLY_SENT';

    const current = await prisma.dailyReading.findUnique({ where: { id } });
    // Record sentAt the first time at least one recipient succeeded (or on a
    // no-recipient SENT); never overwrite an existing timestamp.
    const setSentAt =
      !current?.sentAt && (sent > 0 || (total === 0 && status === 'SENT'));

    const reading = await prisma.dailyReading.update({
      where: { id },
      data: { status, sentAt: setSentAt ? new Date() : undefined },
    });
    return { status, sent, failed, pending, reading };
  },

  /** Dashboard: today, upcoming and past readings with delivery counts. */
  async dashboard(teacherId: string) {
    const readings = await prisma.dailyReading.findMany({
      where: { teacherId },
      orderBy: { readingDate: 'desc' },
      include: { _count: { select: { messages: true } } },
    });

    // Group by calendar day in the app timezone (Brazil), comparing plain
    // YYYY-MM-DD strings so the buckets never drift with the server's UTC clock.
    const today = todayInTimeZone(APP_TIMEZONE);

    // B-19: one aggregate query for delivery counts instead of 2×N counts in a
    // loop. Group messages for all of this teacher's readings by (reading, status).
    const ids = readings.map((r) => r.id);
    const grouped = ids.length
      ? await prisma.whatsAppMessage.groupBy({
          by: ['dailyReadingId', 'status'],
          where: { dailyReadingId: { in: ids } },
          _count: { _all: true },
        })
      : [];

    const counts = new Map<string, { sent: number; failed: number }>();
    for (const g of grouped) {
      if (!g.dailyReadingId) continue;
      const entry = counts.get(g.dailyReadingId) ?? { sent: 0, failed: 0 };
      if (g.status === 'SENT') entry.sent += g._count._all;
      else if (g.status === 'FAILED') entry.failed += g._count._all;
      counts.set(g.dailyReadingId, entry);
    }

    const withCounts = readings.map((r) => {
      const c = counts.get(r.id) ?? { sent: 0, failed: 0 };
      return { ...toReadingDTO(r), sentCount: c.sent, failedCount: c.failed };
    });

    return {
      today: withCounts.filter((r) => r.readingDate === today),
      upcoming: withCounts.filter((r) => r.readingDate > today),
      past: withCounts.filter((r) => r.readingDate < today),
    };
  },
};
