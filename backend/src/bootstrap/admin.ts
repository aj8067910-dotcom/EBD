import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { env } from '../env.js';

const BCRYPT_COST = 12;

/**
 * Ensures an administrator (teacher) account exists on startup when
 * ADMIN_EMAIL and ADMIN_PASSWORD are provided. Idempotent: if a teacher with
 * that e-mail already exists, nothing changes and the password is not reset.
 *
 * This lets a fresh production deploy (e.g. Render) come up with a ready admin
 * login using the operator's own password, instead of shipping the known demo
 * credential from the seed.
 */
export async function bootstrapAdmin(): Promise<void> {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) return;

  const existing = await prisma.teacher.findUnique({ where: { email } });
  if (existing) return;

  const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
  await prisma.teacher.create({
    data: {
      name: env.ADMIN_NAME?.trim() || 'Administrador',
      email,
      passwordHash,
      role: 'TEACHER',
    },
  });
  console.log(`[bootstrap] Conta de administrador criada para ${email}`);
}
