/**
 * Pre-deploy sanity check: validates required environment variables and that
 * the database is reachable.
 *
 *   npm run deploy:check -w backend
 */
import { PrismaClient } from '@prisma/client';
import { collectEnvErrors } from '../src/config/validateDeploy.js';

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

async function main() {
  const errors = collectEnvErrors(process.env);

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
