import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/conference',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4178', browserName: 'chromium', channel: 'chrome', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run preview -- --host 127.0.0.1 --port 4178 --strictPort', url: 'http://127.0.0.1:4178', reuseExistingServer: false },
});
