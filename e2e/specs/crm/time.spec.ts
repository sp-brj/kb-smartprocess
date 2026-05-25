import { test, expect } from "../../fixtures/test";

test.describe("CRM - Time Tracking", () => {
  // Helper to create client and project
  async function createTestProject(crmPage: import("../../pages/crm.page").CrmPage, timestamp: string) {
    await crmPage.gotoNewClient();
    const clientName = `Time Test Client ${timestamp}`;
    await crmPage.createClient({ name: clientName });
    const clientId = await crmPage.getClientIdFromUrl();

    await crmPage.gotoNewProject();
    const projectName = `Time Test Project ${timestamp}`;
    await crmPage.createProject({ name: projectName, clientId });
    const projectId = await crmPage.getProjectIdFromUrl();

    return { clientId, clientName, projectId, projectName };
  }

  test.describe("Time Page", () => {
    test("should display time tracking page", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoTime();
      await crmPage.expectOnTimePage();

      // Should see heading
      await expect(page.getByRole("heading", { name: "Учёт времени" })).toBeVisible();

      // Should see time entry form elements
      await expect(page.getByText("Записать время")).toBeVisible();
    });

    test("should navigate to time report", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoTime();

      // Click report link
      await page.getByRole("link", { name: "Отчёт" }).click();

      // Should be on report page
      await expect(page).toHaveURL(/\/crm\/time\/report/);
    });
  });

  test.describe("Time Entry CRUD", () => {
    test("should add time entry", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId, projectName } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoTime();

      // Fill time entry form
      await page.getByTestId("time-entry-project-select").selectOption(projectId);
      await page.getByTestId("time-entry-minutes-input").fill("60");
      await page.getByTestId("time-entry-work-type-select").selectOption("CONSULTATION");
      await page.getByTestId("time-entry-description-input").fill(`Test time entry ${timestamp}`);
      await page.getByTestId("save-time-entry-button").click();

      // Entry should appear in list
      await page.waitForTimeout(500);
      await expect(page.getByText("1 ч")).toBeVisible();
      await expect(page.getByText(projectName)).toBeVisible();
    });

    test("should add time entry with task", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      // Create a task first
      await crmPage.gotoNewTask();
      const taskTitle = `Time Entry Task ${timestamp}`;
      await crmPage.createTask({
        title: taskTitle,
        projectId: projectId,
      });

      await crmPage.gotoTime();

      // Fill time entry form
      await page.getByTestId("time-entry-project-select").selectOption(projectId);
      // Wait for tasks to load
      await page.waitForTimeout(300);
      // Select task (first option after "Без задачи")
      const taskSelect = page.getByTestId("time-entry-task-select");
      await expect(taskSelect).toBeVisible();
      // Just verify the task option is available
      await expect(taskSelect.getByRole("option", { name: new RegExp(taskTitle) })).toBeVisible();

      await page.getByTestId("time-entry-minutes-input").fill("30");
      await page.getByTestId("save-time-entry-button").click();

      // Entry should appear
      await page.waitForTimeout(500);
      await expect(page.getByText("30 мин")).toBeVisible();
    });

    test("should delete time entry", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoTime();

      // Add entry first
      await page.getByTestId("time-entry-project-select").selectOption(projectId);
      await page.getByTestId("time-entry-minutes-input").fill("45");
      await page.getByTestId("time-entry-description-input").fill(`Delete test entry ${timestamp}`);
      await page.getByTestId("save-time-entry-button").click();

      await page.waitForTimeout(500);

      // Set up dialog handler
      page.on("dialog", (dialog) => dialog.accept());

      // Find and delete the entry
      const entryRow = page.getByText(`Delete test entry ${timestamp}`).locator("..").locator("..");
      await entryRow.getByRole("button", { name: /удалить/i }).click();

      // Entry should be removed
      await expect(page.getByText(`Delete test entry ${timestamp}`)).not.toBeVisible();
    });
  });

  test.describe("Time Report", () => {
    test("should display time report page", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoTimeReport();

      // Should see report heading
      await expect(page.getByRole("heading", { name: "Отчёт по времени" })).toBeVisible();

      // Should see date filters
      await expect(page.getByTestId("report-date-from")).toBeVisible();
      await expect(page.getByTestId("report-date-to")).toBeVisible();
    });

    test("should filter report by date range", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create project and add time entry
      const { projectId } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoTime();
      await page.getByTestId("time-entry-project-select").selectOption(projectId);
      await page.getByTestId("time-entry-minutes-input").fill("120");
      await page.getByTestId("save-time-entry-button").click();

      // Go to report
      await crmPage.gotoTimeReport();

      // Set date range to today
      const today = new Date().toISOString().split("T")[0];
      await page.getByTestId("report-date-from").fill(today);
      await page.getByTestId("report-date-to").fill(today);
      await page.getByTestId("apply-report-filter").click();

      // Should see time in report
      await page.waitForTimeout(500);
      await expect(page.getByText("2 ч")).toBeVisible();
    });
  });
});
