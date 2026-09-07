import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { whatsappMessageService } from '../services/whatsappMessageService.js';
import { dailyReadingService } from '../services/dailyReadingService.js';

let running = false;

// Arbitrary but stable key for the scheduler advisory lock (Postgres only).
const SCHEDULER_LOCK_KEY = 848_201_001;

const isPostgres = /^postgres(ql)?:\/\//i.test(env.DATABASE_URL);

/**
 * Try to acquire a cross-instance advisory lock so only one backend node runs
 * the scheduler tick at a time. On Postgres this uses pg_try_advisory_lock; on
 * other engines (SQLite dev/test) it is a no-op and correctness still holds
 * because each send is claimed atomically per recipient (B-05).
 */
async function withSchedulerLock<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!isPostgres) return fn();
  const rows = await prisma.$queryRaw<
    { locked: boolean }[]
  >`SELECT pg_try_advisory_lock(${SCHEDULER_LOCK_KEY}) AS locked`;
  if (!rows[0]?.locked) return fallback;
  try {
    return await fn();
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(${SCHEDULER_LOCK_KEY})`;
  }
}

/**
 * Send any PUBLISHED reading whose scheduled time has arrived. Safe to run on
 * multiple instances: a Postgres advisory lock serialises the tick and, more
 * importantly, every recipient send is claimed atomically (B-05) so nobody is
 * messaged twice. The reading status is then derived from the real results.
 */
export async function runDueReadings(now: Date = new Date()): Promise<number> {
  if (running) return 0;
  running = true;
  try {
    return await withSchedulerLock(async () => {
      const due = await prisma.dailyReading.findMany({
        where: {
          status: 'PUBLISHED',
          scheduledAt: { not: null, lte: now },
        },
      });
      for (const reading of due) {
        const users = await whatsappMessageService.resolveRecipients({ kind: 'ALL' });
        await dailyReadingService.markSending(reading.id);
        await whatsappMessageService.dispatch(reading, users);
        await dailyReadingService.finalizeStatus(reading.id);
      }
      return due.length;
    }, 0);
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
