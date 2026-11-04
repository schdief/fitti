import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  use: { baseURL: 'http://localhost:5174/fitti/', trace: 'retain-on-failure' },
  projects: [
    { name: 'small-phone', use: { ...devices['iPhone SE'], defaultBrowserType: 'chromium' } },
    { name: 'phone-375', use: { ...devices['iPhone 8'], defaultBrowserType: 'chromium' } },
    // Target device. iPhone 17e: 6.1-inch, 2532 × 1170 at @3x = 390 × 844 CSS px,
    // the same panel as the iPhone 13. Full height because fitti runs from the
    // home screen; the specs inject its 47/34 px safe areas.
    { name: 'iphone-17e', use: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, defaultBrowserType: 'webkit' } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
  ],
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174/fitti/',
    reuseExistingServer: !process.env.CI,
  },
})