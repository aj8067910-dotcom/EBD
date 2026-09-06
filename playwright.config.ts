import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config: boots the backend (fresh SQLite e2e DB + seed) and the built
 * frontend (vite preview), then runs the "full class" scenario.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // In CI the browser comes from `npx playwright install chromium`. Locally,
    // point PW_CHROMIUM_PATH at a pre-installed Chromium to skip the download.
    launchOptions: process.env.PW_CHROMIUM_PATH
      ? { executablePath: process.env.PW_CHROMIUM_PATH }
      : {},
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:serve -w backend',
      url: 'http://localhost:3333/health',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        NODE_ENV: 'test',
        DATABASE_URL: 'file:./e2e.db',
        JWT_SECRET: 'e2e-secret-value',
        CORS_ORIGIN: 'http://localhost:5173',
        PORT: '3333',
      },
    },
    {
      command: 'npm run preview -w frontend -- --port 5173 --strictPort',
      url: 'http://localhost:5173',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
