import { prisma } from '../prisma.js';
import { whatsappMessageService } from '../services/whatsappMessageService.js';
import { dailyReadingService } from '../services/dailyReadingService.js';

let running = false;

/**
 * Send any PUBLISHED reading whose scheduled time has arrived. Idempotent:
 * the WhatsAppMessage unique constraint + SENT check prevents duplicates, and
 * the reading is flipped to SENT afterwards.
 */
export async function runDueReadings(now: Date = new Date()): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    const due = await prisma.dailyReading.findMany({
      where: {
        status: 'PUBLISHED',
        scheduledAt: { not: null, lte: now },
      },
    });
    for (const reading of due) {
      const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
      await whatsappMessageService.dispatch(reading, users);
      await dailyReadingService.markSent(reading.id);
    }
    return due.length;
  } finally {
    running = false;
  }
}

let handle: NodeJS.Timeout | null = null;

/** Start the minute-by-minute scheduler (no-op in tests). */
export function startDailyReadingScheduler() {
  if (handle) return;
  handle = setInterval(() => {
    void runDueReadings().catch((e) => console.error('[dailyReadingJob]', e));
  }, 60_000);
  handle.unref?.();
}

export function stopDailyReadingScheduler() {
  if (handle) clearInterval(handle);
  handle = null;
}
