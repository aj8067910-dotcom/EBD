import type { DailyReading, Teacher } from '@prisma/client';
import { prisma } from '../prisma.js';
import { getWhatsAppProvider } from '../integrations/whatsapp/index.js';
import { maskPhone } from '../lib/phone.js';

export type Audience =
  | { kind: 'ALL' }
  | { kind: 'TEACHERS' }
  | { kind: 'STUDENTS' }
  | { kind: 'SELECTION'; userIds: string[] };

const TYPE = 'DAILY_READING';

/** Active users who have a WhatsApp number and opted into daily readings. */
export async function resolveRecipients(audience: Audience): Promise<Teacher[]> {
  const where: Record<string, unknown> = {
    isActive: true,
    whatsappNumber: { not: null },
  };
  if (audience.kind === 'TEACHERS') where.role = 'TEACHER';
  if (audience.kind === 'STUDENTS') where.role = 'STUDENT';
  if (audience.kind === 'SELECTION') where.id = { in: audience.userIds };

  const users = await prisma.teacher.findMany({
    where,
    include: { subscription: true },
  });
  // Opted in unless a subscription explicitly disables it.
  return users.filter(
    (u) =>
      !u.subscription ||
      (u.subscription.enabled && u.subscription.dailyReadingEnabled),
  );
}

function caption(reading: DailyReading): string {
  const parts = [reading.title, `“${reading.verse}”`, reading.reference];
  if (reading.message) parts.push(reading.message);
  return parts.join('\n\n');
}

async function sendToUser(reading: DailyReading, user: Teacher): Promise<void> {
  if (!user.whatsappNumber) return;

  const existing = await prisma.whatsAppMessage.findUnique({
    where: {
      dailyReadingId_userId_type: {
        dailyReadingId: reading.id,
        userId: user.id,
        type: TYPE,
      },
    },
  });
  if (existing?.status === 'SENT') return; // dedup: already delivered

  const message =
    existing ??
    (await prisma.whatsAppMessage.create({
      data: { dailyReadingId: reading.id, userId: user.id, type: TYPE, status: 'PENDING' },
    }));

  try {
    const result = await getWhatsAppProvider().sendImage(
      user.whatsappNumber,
      reading.imageUrl ?? '',
      caption(reading),
    );
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: 'SENT',
        providerMessageId: result.providerMessageId,
        sentAt: new Date(),
        errorMessage: null,
      },
    });
  } catch (error) {
    await prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: {
        status: 'FAILED',
        errorMessage: (error as Error).message.slice(0, 300),
      },
    });
    console.error(`[whatsapp] falha ao enviar para ${maskPhone(user.whatsappNumber)}`);
  }
}

export const whatsappMessageService = {
  resolveRecipients,

  /** Send a reading to a set of users (sequential; caller decides awaiting). */
  async dispatch(reading: DailyReading, users: Teacher[]): Promise<void> {
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      await sendToUser(reading, user);
    }
  },

  async status(dailyReadingId: string) {
    const [sent, failed, pending] = await Promise.all([
      prisma.whatsAppMessage.count({ where: { dailyReadingId, status: 'SENT' } }),
      prisma.whatsAppMessage.count({ where: { dailyReadingId, status: 'FAILED' } }),
      prisma.whatsAppMessage.count({ where: { dailyReadingId, status: 'PENDING' } }),
    ]);
    return { sent, failed, pending, total: sent + failed + pending };
  },
};
