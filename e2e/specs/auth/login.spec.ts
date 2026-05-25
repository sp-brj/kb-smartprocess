import { test, expect, TEST_USER_EMAIL, TEST_USER_PASSWORD } from "../../fixtures/test";

test.describe("Authentication - Login", () => {
  test("should show login page for unauthenticated users", async ({ page, loginPage }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
    await loginPage.expectOnLoginPage();
  });

  test("should login with valid credentials", async ({ loginPage, dashboardPage }) => {
    await loginPage.goto();
    await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await dashboardPage.expectLoggedIn(TEST_USER_EMAIL);
  });

  test("should show error for invalid credentials", async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.login("nonexistent@example.com", "wrongpassword");
    // Error message is in Russian
    await loginPage.expectError("не найден");
  });

  test("should redirect /register to login", async ({ page, loginPage }) => {
    await page.goto("/register");
    await expect(page).toHaveURL(/\/login/);
    await loginPage.expectOnLoginPage();
  });
});
