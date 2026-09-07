import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { getWhatsAppProvider } from '../integrations/whatsapp/index.js';
import { Errors } from '../errors.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const OTP_COST = 8;
// Rate limit: at most 5 code requests per number per 15-minute window. Counted
// from the persisted OtpCode rows, so it holds across restarts and instances
// (B-06) — no in-memory bucket that a second node could bypass.
const OTP_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_REQUESTS = 5;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type OtpPurpose = 'LOGIN' | 'REGISTER' | 'CHANGE_NUMBER';

export const otpService = {
  /**
   * Generate, store (hashed) and send an OTP for a normalized number. Any
   * pending flow state (register name / number-change userId) is persisted on
   * the challenge so the flow survives a restart and works across instances.
   */
  async request(
    whatsappNumber: string,
    purpose: OtpPurpose,
    extra?: { name?: string; userId?: string },
  ) {
    // Rate limit: 5 requests / 15 min per number (persistent/distributed).
    const windowStart = new Date(Date.now() - OTP_REQUEST_WINDOW_MS);
    const recentRequests = await prisma.otpCode.count({
      where: { whatsappNumber, createdAt: { gte: windowStart } },
    });
    if (recentRequests >= MAX_OTP_REQUESTS) {
      throw Errors.tooManyRequests('Muitos códigos solicitados. Aguarde alguns minutos.');
    }

    const code = generateCode();
    const codeHash = await bcrypt.hash(code, OTP_COST);

    // Invalidate previous unconsumed challenges for this number.
    await prisma.otpCode.updateMany({
      where: { whatsappNumber, consumed: false },
      data: { consumed: true },
    });

    await prisma.otpCode.create({
      data: {
        whatsappNumber,
        codeHash,
        purpose,
        name: extra?.name ?? null,
        userId: extra?.userId ?? null,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    await getWhatsAppProvider().sendOtp(whatsappNumber, code);
  },

  /**
   * Verify an OTP. Throws on invalid/expired/too-many-attempts; on success
   * marks the challenge consumed.
   */
  async verify(whatsappNumber: string, code: string) {
    const challenge = await prisma.otpCode.findFirst({
      where: { whatsappNumber, consumed: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!challenge) {
      throw Errors.unauthorized('Código inválido ou expirado');
    }
    if (challenge.expiresAt.getTime() < Date.now()) {
      throw Errors.unauthorized('Código expirado');
    }
    if (challenge.attempts >= MAX_ATTEMPTS) {
      throw Errors.tooManyRequests('Muitas tentativas. Solicite um novo código.');
    }

    const ok = await bcrypt.compare(code, challenge.codeHash);
    if (!ok) {
      await prisma.otpCode.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      });
      throw Errors.unauthorized('Código incorreto');
    }

    await prisma.otpCode.update({
      where: { id: challenge.id },
      data: { consumed: true },
    });
    return {
      purpose: challenge.purpose,
      name: challenge.name,
      userId: challenge.userId,
    };
  },

  /** Latest active (unconsumed, unexpired) pending number-change for a user. */
  async findPendingNumberChange(userId: string) {
    return prisma.otpCode.findFirst({
      where: {
        userId,
        purpose: 'CHANGE_NUMBER',
        consumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  },
};
