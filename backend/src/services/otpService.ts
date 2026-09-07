import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { allow } from '../realtime/rateLimit.js';
import { getWhatsAppProvider } from '../integrations/whatsapp/index.js';
import { Errors } from '../errors.js';

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const OTP_COST = 8;

function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const otpService = {
  /** Generate, store (hashed) and send an OTP for a normalized number. */
  async request(whatsappNumber: string, purpose: 'LOGIN' | 'REGISTER') {
    // Rate limit: 5 requests / 15 min per number.
    if (!allow(`otp:${whatsappNumber}`, 5, 15 * 60_000)) {
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
    return { purpose: challenge.purpose };
  },
};
