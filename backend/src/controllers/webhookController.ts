import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma.js';
import { env } from '../env.js';

interface StatusEvent {
  entry?: {
    changes?: { value?: { statuses?: { id: string; status: string; errors?: { title?: string }[] }[] } }[];
  }[];
}

export const webhookController = {
  /** Meta verification handshake. */
  async verify(request: FastifyRequest, reply: FastifyReply) {
    const q = request.query as Record<string, string>;
    if (
      q['hub.mode'] === 'subscribe' &&
      env.WHATSAPP_WEBHOOK_VERIFY_TOKEN &&
      q['hub.verify_token'] === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
    ) {
      return reply.type('text/plain').send(q['hub.challenge'] ?? '');
    }
    return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Verificação falhou' } });
  },

  /**
   * Delivery/read/failure events. We never trust the payload blindly: only
   * known providerMessageIds are matched, and only status is updated.
   */
  async receive(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as StatusEvent;
    const statuses =
      body.entry?.flatMap(
        (e) => e.changes?.flatMap((c) => c.value?.statuses ?? []) ?? [],
      ) ?? [];

    for (const s of statuses) {
      if (!s.id) continue;
      const mapped =
        s.status === 'failed' ? 'FAILED' : s.status === 'sent' ? 'SENT' : null;
      if (!mapped) continue; // ignore delivered/read for our coarse status
      await prisma.whatsAppMessage
        .updateMany({
          where: { providerMessageId: s.id },
          data: {
            status: mapped,
            errorMessage: s.errors?.[0]?.title ?? null,
          },
        })
        .catch(() => undefined);
    }
    // Always 200 so the provider does not retry indefinitely.
    return reply.send({ received: true });
  },
};
