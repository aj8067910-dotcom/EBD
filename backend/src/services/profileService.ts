import { prisma } from '../prisma.js';
import { maskPhone, normalizePhone } from '../lib/phone.js';
import { otpService } from './otpService.js';
import { Errors } from '../errors.js';

export const profileService = {
  async get(userId: string) {
    const user = await prisma.teacher.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
    if (!user) throw Errors.unauthorized();
    return {
      id: user.id,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      whatsappNumberMasked: maskPhone(user.whatsappNumber),
      preferences: {
        enabled: user.subscription?.enabled ?? true,
        dailyReadingEnabled: user.subscription?.dailyReadingEnabled ?? true,
      },
    };
  },

  async updatePreferences(
    userId: string,
    prefs: { enabled?: boolean; dailyReadingEnabled?: boolean; name?: string },
  ) {
    if (prefs.name !== undefined) {
      await prisma.teacher.update({ where: { id: userId }, data: { name: prefs.name.trim() } });
    }
    await prisma.whatsAppSubscription.upsert({
      where: { userId },
      update: {
        enabled: prefs.enabled,
        dailyReadingEnabled: prefs.dailyReadingEnabled,
      },
      create: {
        userId,
        enabled: prefs.enabled ?? true,
        dailyReadingEnabled: prefs.dailyReadingEnabled ?? true,
      },
    });
    return this.get(userId);
  },

  /**
   * Changing the number requires a fresh OTP sent to the new number. The
   * pending target number is persisted on the OTP challenge (keyed by userId),
   * so the flow survives a restart and works across instances (B-04).
   */
  async requestNumberChange(userId: string, newNumber: string) {
    const e164 = normalizePhone(newNumber);
    if (!e164) throw Errors.validation('Número de WhatsApp inválido');
    const taken = await prisma.teacher.findUnique({ where: { whatsappNumber: e164 } });
    if (taken && taken.id !== userId) throw Errors.conflict('Número já em uso');
    await otpService.request(e164, 'CHANGE_NUMBER', { userId });
    return { whatsappNumberMasked: maskPhone(e164) };
  },

  async confirmNumberChange(userId: string, code: string) {
    const pending = await otpService.findPendingNumberChange(userId);
    if (!pending) throw Errors.validation('Nenhuma alteração de número pendente');
    const e164 = pending.whatsappNumber;
    await otpService.verify(e164, code);

    // Re-check uniqueness at confirm time (another user may have claimed it in
    // the meantime) and translate a unique-constraint race into a clean 409.
    const taken = await prisma.teacher.findUnique({ where: { whatsappNumber: e164 } });
    if (taken && taken.id !== userId) throw Errors.conflict('Número já em uso');
    try {
      await prisma.teacher.update({
        where: { id: userId },
        data: { whatsappNumber: e164 },
      });
    } catch (err) {
      if ((err as { code?: string }).code === 'P2002') {
        throw Errors.conflict('Número já em uso');
      }
      throw err;
    }
    return this.get(userId);
  },
};
