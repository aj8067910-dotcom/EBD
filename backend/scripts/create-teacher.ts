/**
 * Create the first teacher account in production (registration is also open via
 * the UI, but this is handy for provisioning).
 *
 *   npm run create-teacher -w backend -- "Nome" email@exemplo.com senhaForte
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const [, , name, email, password] = process.argv;

if (!name || !email || !password) {
  console.error('Uso: create-teacher "Nome" email@exemplo.com senha');
  process.exit(1);
}
if (password.length < 8) {
  console.error('A senha deve ter ao menos 8 caracteres.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.teacher.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    console.error(`Já existe um professor com o e-mail ${normalizedEmail}.`);
    process.exit(1);
  }
  const teacher = await prisma.teacher.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 12),
    },
  });
  console.log(`✓ Professor criado: ${teacher.name} <${teacher.email}>`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
