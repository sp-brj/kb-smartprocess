import { test, expect } from "../../fixtures/test";

test.describe("Authentication - Logout", () => {
  test("should logout and redirect to login page", async ({ authenticatedPage, page }) => {
    await authenticatedPage.logout();
    // Wait for redirect after signOut
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should not be able to access dashboard after logout", async ({ authenticatedPage, page }) => {
    await authenticatedPage.logout();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Try to access dashboard
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });

  test("should not be able to access articles after logout", async ({ authenticatedPage, page }) => {
    await authenticatedPage.logout();
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });

    // Try to access articles
    await page.goto("/articles");
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
