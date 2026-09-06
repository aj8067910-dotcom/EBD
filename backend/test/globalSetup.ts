import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const TEST_DB_URL = 'file:./test.db';

/**
 * Vitest global setup: create a clean SQLite test database and apply the
 * current Prisma schema to it before the suite runs.
 */
export default function setup() {
  const dbPath = fileURLToPath(new URL('../prisma/test.db', import.meta.url));
  if (existsSync(dbPath)) rmSync(dbPath);

  execFileSync(
    'npx',
    ['prisma', 'db', 'push', '--skip-generate', '--accept-data-loss'],
    {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, DATABASE_URL: TEST_DB_URL },
      stdio: 'ignore',
    },
  );
}
