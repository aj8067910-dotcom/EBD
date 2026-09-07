import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { prisma } from '../prisma.js';
import { env } from '../env.js';

/**
 * Validate Meta's X-Hub-Signature-256 header against the raw request body using
 * the App Secret (B-10). Uses a constant-time comparison. When no App Secret is
 * configured (dev/mock) validation is skipped. The secret is never logged.
 */
function verifySignature(request: FastifyRequest): boolean {
  const secret = env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // signature validation disabled (dev/mock)

  const header = request.headers['x-hub-signature-256'];
  const signature = Array.isArray(header) ? header[0] : header;
  if (!signature || !signature.startsWith('sha256=')) return false;

  const raw = (request as unknown as { rawBody?: Buffer }).rawBody;
  if (!raw) return false;

  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  const provided = signature.slice('sha256='.length);
  // Compare as fixed-length hex buffers with a timing-safe comparison.
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
  } catch {
    return false;
  }
}

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
    if (!verifySignature(request)) {
      return reply
        .status(401)
        .send({ error: { code: 'INVALID_SIGNATURE', message: 'Assinatura inválida' } });
    }
    const body = (request.body ?? {}) as StatusEvent;
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
