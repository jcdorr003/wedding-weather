import { defineConfig, devices } from '@playwright/test'

// E2E runs against the mock build, served the way GitHub Pages serves the real one.
export default defineConfig({
  testDir: 'tests/e2e',
  snapshotPathTemplate: '{testDir}/__snapshots__/{arg}{ext}',
  timeout: 60_000,
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4180/wedding-weather/', ...devices['Desktop Chrome'] },
  webServer: {
    command: 'node scripts/serve.mjs dist-mock/client 4180',
    url: 'http://localhost:4180/wedding-weather/',
    reuseExistingServer: !process.env.CI,
  },
})
