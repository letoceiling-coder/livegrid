import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:5173';
const apiURL = process.env.E2E_API_URL ?? 'http://127.0.0.1:3000';
const soakDurationMs = Number(process.env.SOAK_DURATION_MS ?? 120_000);

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: /smoke\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'soak',
      testMatch: /soak\/mini-soak\.spec\.ts/,
      timeout: soakDurationMs + 60_000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'soak-governance',
      testMatch: /soak\/governance-polish\.spec\.ts/,
      timeout: soakDurationMs + 60_000,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'soak-full',
      testMatch: /soak\/admin-session\.spec\.ts/,
      timeout: 3_700_000,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_SKIP_WEBSERVER
    ? undefined
    : [
        {
          command: 'pnpm --filter @lg/web dev --host 127.0.0.1 --port 5173',
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
  metadata: { apiURL },
});
