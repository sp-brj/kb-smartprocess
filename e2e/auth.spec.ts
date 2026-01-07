import { test, expect } from "@playwright/test";

test.describe("Authentication", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h2")).toContainText("Вход");
  });

  test("should register a new user", async ({ page }) => {
    const email = `test-reg-${Date.now()}@example.com`;

    await page.goto("/register");
    await expect(page.locator("h2")).toContainText("Регистрация");

    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Should redirect to login after registration
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  test("should login with valid credentials", async ({ page }) => {
    // First register
    const email = `test-login-${Date.now()}@example.com`;

    await page.goto("/register");
    await page.fill('input[name="name"]', "Test User");
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Now login
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "password123");
    await page.click('button[type="submit"]');

    // Should redirect to dashboard - check for element that only exists on dashboard
    await expect(page.locator("header").getByText("Новая статья")).toBeVisible({ timeout: 10000 });
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error (NextAuth returns "CredentialsSignin" or custom error)
    await expect(page.locator(".bg-red-50")).toBeVisible({ timeout: 5000 });
  });
});
