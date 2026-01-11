import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Configuration
 *
 * Запуск тестов:
 *   Локально:    npx playwright test
 *   Production:  BASE_URL=https://kb-smartprocess.vercel.app npx playwright test
 *
 * При запуске на production (Supabase free tier):
 *   - Последовательный запуск (1 worker) во избежание "max clients reached"
 *   - 2 retry на случай временных сбоев БД
 *   - Отключен локальный dev server
 */

const baseURL = process.env.BASE_URL || "http://localhost:3000";
const isExternalURL = !!process.env.BASE_URL;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: !isExternalURL, // Sequential for external URLs to avoid DB pool exhaustion
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : isExternalURL ? 2 : 0, // Retries for CI and external URLs
  workers: process.env.CI ? 1 : isExternalURL ? 1 : undefined, // Single worker for external URLs
  reporter: "html",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox and mobile projects commented out - uncomment after installing browsers:
    // npx playwright install firefox webkit
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "mobile",
    //   use: { ...devices["iPhone 13"] },
    // },
  ],
  // Only start local dev server if not using external URL
  webServer: isExternalURL ? undefined : {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
