/**
 * Pre-deploy sanity check: validates required environment variables and that
 * the database is reachable.
 *
 *   npm run deploy:check -w backend
 */
import { PrismaClient } from '@prisma/client';

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const errors: string[] = [];

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) errors.push('DATABASE_URL ausente');

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 8) {
    errors.push('JWT_SECRET ausente ou muito curto (mín. 8 caracteres)');
  }
  if (secret && /change-me|dev-secret|e2e-secret/.test(secret)) {
    errors.push('JWT_SECRET parece ser um valor de exemplo — gere um segredo real');
  }

  if (!process.env.CORS_ORIGIN) {
    console.warn('⚠ CORS_ORIGIN não definido — usando o padrão de desenvolvimento');
  }

  if (errors.length > 0) {
    errors.forEach((e) => console.error(`✗ ${e}`));
    fail('Configuração de ambiente inválida.');
  }
  console.log('✓ Variáveis de ambiente OK');

  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Conexão com o banco de dados OK');
  } catch (error) {
    console.error(error);
    fail('Não foi possível conectar ao banco de dados.');
  } finally {
    await prisma.$disconnect();
  }

  console.log('✓ Tudo pronto para o deploy.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
