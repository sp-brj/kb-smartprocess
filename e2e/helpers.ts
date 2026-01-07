import { expect, Page } from "@playwright/test";

export async function login(page: Page, prefix: string = "test") {
  const email = `${prefix}-${Date.now()}@example.com`;

  // Register
  await page.goto("/register");
  await page.fill('input[name="name"]', "Test User");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Wait for redirect to login page
  await page.waitForURL(/\/login/, { timeout: 10000 });

  // Login
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');

  // Wait for dashboard to load (check for "New article" button which only exists on dashboard)
  await expect(page.locator("text=Новая статья").first()).toBeVisible({ timeout: 10000 });
}
