import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Authentication", () => {
  test("should show login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h2")).toContainText("Вход");
  });

  test("should login with valid credentials", async ({ page }) => {
    // Use pre-seeded test user
    await login(page, "auth");

    // Should be on dashboard - check for element that only exists on dashboard
    await expect(
      page.locator("header").getByText("Новая статья")
    ).toBeVisible();
  });

  test("should show error for invalid credentials", async ({ page }) => {
    await page.goto("/login");

    await page.fill('input[name="email"]', "nonexistent@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.click('button[type="submit"]');

    // Should show error (NextAuth returns "CredentialsSignin" or custom error)
    await expect(page.locator(".bg-red-50")).toBeVisible({ timeout: 5000 });
  });

  test("should redirect /register to login", async ({ page }) => {
    // Registration page no longer exists, should redirect
    await page.goto("/register");
    await expect(page).toHaveURL(/\/login/);
  });
});
