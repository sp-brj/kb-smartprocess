import { test as base, expect } from "@playwright/test";
import { LoginPage, DashboardPage, ArticleEditorPage, ArticleViewPage, AdminUsersPage } from "../pages";

// Test user credentials (must be created via: npx tsx scripts/seed-test-user.ts)
export const TEST_USER_EMAIL = "e2e-test@example.com";
export const TEST_USER_PASSWORD = "testpassword123";

type AuthFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  articleEditorPage: ArticleEditorPage;
  articleViewPage: ArticleViewPage;
  adminUsersPage: AdminUsersPage;
  authenticatedPage: DashboardPage;
};

export const test = base.extend<AuthFixtures>({
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  articleEditorPage: async ({ page }, use) => {
    const articleEditorPage = new ArticleEditorPage(page);
    await use(articleEditorPage);
  },

  articleViewPage: async ({ page }, use) => {
    const articleViewPage = new ArticleViewPage(page);
    await use(articleViewPage);
  },

  adminUsersPage: async ({ page }, use) => {
    const adminUsersPage = new AdminUsersPage(page);
    await use(adminUsersPage);
  },

  authenticatedPage: async ({ page, loginPage, dashboardPage }, use) => {
    await loginPage.goto();
    await loginPage.login(TEST_USER_EMAIL, TEST_USER_PASSWORD);
    await expect(page.getByTestId("new-article-btn")).toBeVisible({ timeout: 10000 });
    await use(dashboardPage);
  },
});

export { expect };
