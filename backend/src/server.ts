import { buildApp } from './app.js';
import { attachRealtime } from './realtime/index.js';
import { startDailyReadingScheduler } from './jobs/dailyReadingJob.js';
import { bootstrapAdmin } from './bootstrap/admin.js';
import { env } from './env.js';
import { prisma } from './prisma.js';

async function start() {
  const app = await buildApp();
  attachRealtime(app);
  startDailyReadingScheduler();

  // Create the first admin from env vars if configured (idempotent). A failure
  // here must not prevent the server from booting.
  try {
    await bootstrapAdmin();
  } catch (error) {
    app.log.error(error, 'admin bootstrap failed');
  }

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
