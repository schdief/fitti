import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5174/fitti/', trace: 'retain-on-failure' },
  projects: [
    { name: 'small-phone', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
    { name: 'phone-375', use: { ...devices['iPhone 8'], defaultBrowserType: 'chromium' } },
    { name: 'iphone-webkit', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, defaultBrowserType: 'webkit' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174/fitti/',
    reuseExistingServer: !process.env.CI,
  },
})