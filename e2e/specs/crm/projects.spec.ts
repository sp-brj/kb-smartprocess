import { test, expect } from "../../fixtures/test";

test.describe("CRM - Projects", () => {
  // Helper to create a client for project tests
  async function createTestClient(crmPage: import("../../pages/crm.page").CrmPage, timestamp: string) {
    await crmPage.gotoNewClient();
    const clientName = `Project Test Client ${timestamp}`;
    await crmPage.createClient({ name: clientName });
    const clientId = await crmPage.getClientIdFromUrl();
    return { clientId, clientName };
  }

  test.describe("Project List", () => {
    test("should display projects list page", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoProjects();
      await crmPage.expectOnProjectsPage();

      // Should see heading and controls
      await expect(page.getByRole("heading", { name: "Проекты" })).toBeVisible();
      await expect(crmPage.newProjectButton).toBeVisible();
      await expect(crmPage.projectsTableView).toBeVisible();
      await expect(crmPage.projectsFunnelView).toBeVisible();
    });

    test("should switch between table and funnel views", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoProjects();

      // Default is table view
      await expect(page.locator("table")).toBeVisible();

      // Switch to funnel view
      await crmPage.switchToFunnelView();
      // Should see status columns
      await expect(page.getByText("Лид")).toBeVisible();
      await expect(page.getByText("Переговоры")).toBeVisible();

      // Switch back to table view
      await crmPage.switchToTableView();
      await expect(page.locator("table")).toBeVisible();
    });

    test("should search projects", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // First create a client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `SearchTest Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
      });

      // Go to projects list and search
      await crmPage.gotoProjects();
      await crmPage.searchProjects("SearchTest");
      await crmPage.expectProjectInTable(projectName);

      // Search for non-existent project
      await crmPage.searchProjects("NonExistentProject12345");
      await expect(page.getByText("Проекты не найдены")).toBeVisible();
    });
  });

  test.describe("Project CRUD", () => {
    test("should create a new project", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client first
      const { clientId, clientName } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();

      // Should see form heading
      await expect(page.getByRole("heading", { name: "Новый проект" })).toBeVisible();

      const projectName = `Test Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
        type: "CONSULTING",
        budget: "100000",
      });

      // Should redirect to project detail page
      await crmPage.expectOnProjectDetailPage();

      // Should display project info
      await expect(page.getByRole("heading", { name: projectName, exact: false })).toBeVisible();
      await expect(page.getByText(clientName)).toBeVisible();
      await expect(page.getByText("Консалтинг")).toBeVisible();
    });

    test("should not allow creating project without client", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      await crmPage.gotoNewProject();

      // Fill name but not client
      await crmPage.projectNameInput.fill(`Test Project ${timestamp}`);

      // Save button should be disabled
      await expect(crmPage.saveProjectButton).toBeDisabled();
    });

    test("should navigate back from new project form", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoNewProject();
      await page.getByText("Назад к списку").click();
      await crmPage.expectOnProjectsPage();
    });

    test("should view project details with stats", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `Detail Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
        budget: "500000",
      });

      await crmPage.expectOnProjectDetailPage();

      // Check stats are displayed
      await expect(page.getByText("Время")).toBeVisible();
      await expect(page.getByText("Бюджет")).toBeVisible();
      await expect(page.getByText("500 000")).toBeVisible();
      await expect(page.getByText("Оплачено")).toBeVisible();

      // Check action buttons
      await expect(page.getByRole("link", { name: "Редактировать" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Удалить" })).toBeVisible();
    });

    test("should edit project", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const originalName = `Edit Test Project ${timestamp}`;
      await crmPage.createProject({
        name: originalName,
        clientId: clientId,
      });

      await crmPage.expectOnProjectDetailPage();

      // Click edit
      await page.getByRole("link", { name: "Редактировать" }).click();
      await expect(page).toHaveURL(/\/crm\/projects\/[^/]+\/edit$/);

      // Update the name
      const newName = `Updated Project ${timestamp}`;
      await crmPage.projectNameInput.fill(newName);
      await crmPage.saveProjectButton.click();

      // Should redirect to detail page with new name
      await crmPage.expectOnProjectDetailPage();
      await expect(page.getByRole("heading", { name: newName, exact: false })).toBeVisible();
    });

    test("should delete project", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `Delete Test Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
      });

      await crmPage.expectOnProjectDetailPage();

      // Set up dialog handler
      page.on("dialog", (dialog) => dialog.accept());

      // Click delete
      await page.getByRole("button", { name: "Удалить" }).click();

      // Should redirect to projects list
      await crmPage.expectOnProjectsPage();

      // Project should not be in list
      await crmPage.searchProjects(projectName);
      await expect(page.getByText("Проекты не найдены")).toBeVisible();
    });
  });

  test.describe("Project Funnel", () => {
    test("should display projects in funnel by status", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `Funnel Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
      });

      // Go to projects and switch to funnel view
      await crmPage.gotoProjects();
      await crmPage.switchToFunnelView();

      // Project should be visible in one of the columns
      await expect(page.getByText(projectName)).toBeVisible();
    });
  });

  test.describe("Project Tasks", () => {
    test("should add task from project page", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `Task Test Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
      });

      await crmPage.expectOnProjectDetailPage();
      const projectId = await crmPage.getProjectIdFromUrl();

      // Click add task
      await page.getByRole("link", { name: "+ Добавить" }).click();

      // Should go to task form with project preselected
      await expect(page).toHaveURL(new RegExp(`projectId=${projectId}`));

      // Fill task form
      const taskTitle = `Test Task ${timestamp}`;
      await crmPage.taskTitleInput.fill(taskTitle);
      await crmPage.saveTaskButton.click();

      // Should go to kanban
      await crmPage.expectOnProjectKanbanPage();

      // Task should be visible in kanban
      await crmPage.expectTaskInKanban(taskTitle, "TODO");
    });
  });

  test.describe("Project Payments", () => {
    test("should add payment to project", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client and project
      const { clientId } = await createTestClient(crmPage, timestamp);

      await crmPage.gotoNewProject();
      const projectName = `Payment Project ${timestamp}`;
      await crmPage.createProject({
        name: projectName,
        clientId: clientId,
        budget: "100000",
      });

      await crmPage.expectOnProjectDetailPage();

      // Click add payment
      await page.getByRole("button", { name: "+ Добавить" }).click();

      // Fill payment form
      await page.getByTestId("payment-amount-input").fill("50000");
      await page.getByTestId("payment-type-select").selectOption("ADVANCE");
      await page.getByTestId("payment-status-select").selectOption("RECEIVED");
      await page.getByTestId("save-payment-button").click();

      // Payment should appear and stats should update
      await expect(page.getByText("50 000")).toBeVisible();
      await expect(page.getByText("50%")).toBeVisible();
    });
  });
});
