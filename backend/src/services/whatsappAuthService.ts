import { prisma } from '../prisma.js';
import { env } from '../env.js';
import { normalizePhone, maskPhone } from '../lib/phone.js';
import { otpService } from './otpService.js';
import { Errors } from '../errors.js';

/** Pending self-registration names, keyed by E.164 (short-lived, in-memory). */
const pendingNames = new Map<string, string>();

function teacherAllowlist(): Set<string> {
  return new Set(
    env.TEACHER_WHATSAPP_ALLOWLIST.split(',')
      .map((n) => normalizePhone(n))
      .filter((n): n is string => !!n),
  );
}

export interface PublicUser {
  id: string;
  name: string;
  role: string;
  whatsappNumberMasked: string;
}

export function toPublicUser(user: {
  id: string;
  name: string;
  role: string;
  whatsappNumber: string | null;
}): PublicUser {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    whatsappNumberMasked: maskPhone(user.whatsappNumber),
  };
}

function requireNormalized(input: string): string {
  const e164 = normalizePhone(input);
  if (!e164) throw Errors.validation('Número de WhatsApp inválido');
  return e164;
}

export const whatsappAuthService = {
  /** Step 1 (login): send an OTP to an existing, active user. */
  async requestLogin(whatsappNumber: string) {
    const e164 = requireNormalized(whatsappNumber);
    const user = await prisma.teacher.findUnique({ where: { whatsappNumber: e164 } });
    if (!user || !user.isActive) {
      throw Errors.notFound('Número não cadastrado');
    }
    await otpService.request(e164, 'LOGIN');
    return { whatsappNumberMasked: maskPhone(e164) };
  },

  /** Step 1 (register): send an OTP to a new number, remembering the name. */
  async register(name: string, whatsappNumber: string) {
    const e164 = requireNormalized(whatsappNumber);
    const existing = await prisma.teacher.findUnique({ where: { whatsappNumber: e164 } });
    if (existing) throw Errors.conflict('Número já cadastrado');
    pendingNames.set(e164, name.trim());
    await otpService.request(e164, 'REGISTER');
    return { whatsappNumberMasked: maskPhone(e164) };
  },

  /** Step 2: verify the OTP; log in or finish registration. Returns the user. */
  async verify(whatsappNumber: string, code: string) {
    const e164 = requireNormalized(whatsappNumber);
    const { purpose } = await otpService.verify(e164, code);

    let user = await prisma.teacher.findUnique({ where: { whatsappNumber: e164 } });

    if (purpose === 'REGISTER') {
      if (user) throw Errors.conflict('Número já cadastrado');
      const name = pendingNames.get(e164) ?? 'Usuário';
      pendingNames.delete(e164);
      const role = teacherAllowlist().has(e164) ? 'TEACHER' : 'STUDENT';
      user = await prisma.teacher.create({
        data: {
          name,
          whatsappNumber: e164,
          role,
          subscription: { create: {} },
        },
      });
    }

    if (!user || !user.isActive) {
      throw Errors.unauthorized('Conta indisponível');
    }

    await prisma.teacher.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return user;
  },

  async me(userId: string) {
    const user = await prisma.teacher.findUnique({ where: { id: userId } });
    if (!user) throw Errors.unauthorized();
    return user;
  },
};
