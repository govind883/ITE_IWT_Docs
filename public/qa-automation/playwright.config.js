// @ts-check
const { defineConfig } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const authFile = path.join(__dirname, 'playwright', '.auth', 'user.json');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  expect: { timeout: 10000 },
  retries: 0,
  fullyParallel: false,
  workers: 1, // keep sequential so screens are tested one tab at a time
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    video: 'on',          // record video for every screen, pass or fail
    screenshot: 'off',    // screenshots are handled manually in the test for full-page capture
    trace: 'off',
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10000,
    navigationTimeout: 15000,
  },
  projects: [
    {
      name: 'debug',
      testMatch: /debug-single\.spec\.js/,
    },
    {
      name: 'chromium',
      testMatch: /qa-smoke\.spec\.js/,
    },
    {
      name: 'functional',
      testMatch: /functional-create\.spec\.js/,
    },
  ],
});
