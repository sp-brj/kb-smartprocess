import { test, expect } from "../../fixtures/test";

test.describe("CRM - Navigation", () => {
  test("should navigate to CRM from header module switcher", async ({
    authenticatedPage,
    crmPage,
    page,
  }) => {
    // Should see module switcher
    await crmPage.expectModuleSwitcherVisible();

    // Click CRM link
    await crmPage.crmLink.click();

    // Should be on CRM dashboard
    await crmPage.expectOnCRMDashboard();
    await crmPage.expectCRMModuleActive();
  });

  test("should navigate between CRM sections via tabs", async ({
    authenticatedPage,
    crmPage,
    page,
  }) => {
    await crmPage.gotoCRM();
    await crmPage.expectOnCRMDashboard();

    // Navigate to Clients
    await crmPage.navClients.click();
    await crmPage.expectOnClientsPage();

    // Navigate to Projects
    await crmPage.navProjects.click();
    await crmPage.expectOnProjectsPage();

    // Navigate to Tasks
    await crmPage.navTasks.click();
    await crmPage.expectOnTasksPage();

    // Navigate to Time
    await crmPage.navTime.click();
    await crmPage.expectOnTimePage();
  });

  test("should switch back to KB module from CRM", async ({
    authenticatedPage,
    crmPage,
    page,
  }) => {
    // Go to CRM first
    await crmPage.gotoCRM();
    await crmPage.expectCRMModuleActive();

    // Switch back to KB
    await crmPage.kbLink.click();

    // Should be on KB (articles) page
    await expect(page).toHaveURL(/\/(articles)?$/);
    await crmPage.expectKBModuleActive();
  });

  test("CRM dashboard should show widgets", async ({
    authenticatedPage,
    crmPage,
    page,
  }) => {
    await crmPage.gotoCRM();

    // Should see main dashboard elements
    await expect(page.getByRole("heading", { name: "CRM" })).toBeVisible();
    await expect(page.getByText("Управление клиентами и проектами")).toBeVisible();

    // Should see some stats cards (they may have 0 values but should exist)
    await expect(page.getByText("Клиентов")).toBeVisible();
    await expect(page.getByText("Проектов")).toBeVisible();
  });

  test("should navigate to settings/statuses", async ({
    authenticatedPage,
    crmPage,
    page,
  }) => {
    await crmPage.gotoCRM();

    // Click settings tab
    await crmPage.navSettings.click();

    // Should be on statuses settings page
    await crmPage.expectOnSettingsPage();
    await expect(page.getByRole("heading", { name: "Статусы проектов" })).toBeVisible();
  });
});
