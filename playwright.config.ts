import { defineConfig, devices } from '@playwright/test';

const webgl = ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'];

export default defineConfig({
  testDir: 'tests/e2e',
  workers: 1, // tests share the Worker's in-memory outbox
  fullyParallel: false,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:8788', trace: 'retain-on-failure' },
  webServer: {
    command: 'npm run build:e2e && npx wrangler dev --env e2e --port 8788 --ip 127.0.0.1',
    url: 'http://127.0.0.1:8788/',
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], launchOptions: { args: webgl } }, testIgnore: /webgl-off\.spec\.ts/ },
    { name: 'webgl-off', use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--disable-webgl', '--disable-3d-apis'] } }, testMatch: /webgl-off\.spec\.ts/ },
  ],
});
