import { buildApp } from './app.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

async function start() {
  const app = await buildApp();

  const close = async () => {
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', close);
  process.on('SIGTERM', close);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Koinonia backend listening on http://localhost:${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

start();
