import { expect, Page } from "@playwright/test";

// Test user credentials (must be created via: npx tsx scripts/seed-test-user.ts)
const TEST_USER_EMAIL = "e2e-test@example.com";
const TEST_USER_PASSWORD = "testpassword123";

export async function login(page: Page, _prefix: string = "test") {
  // Go to login page
  await page.goto("/login");

  // Login with pre-seeded test user
  await page.fill('input[name="email"]', TEST_USER_EMAIL);
  await page.fill('input[name="password"]', TEST_USER_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for dashboard to load (check for "New article" button which only exists on dashboard)
  await expect(page.locator("text=Новая статья").first()).toBeVisible({
    timeout: 10000,
  });
}
