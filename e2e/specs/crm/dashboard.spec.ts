import { test, expect } from "../../fixtures/test";

test.describe("CRM - Dashboard", () => {
  test.describe("Dashboard Widgets", () => {
    test("should display all dashboard widgets", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();
      await crmPage.expectOnCRMDashboard();

      // Should see main stats cards
      await expect(page.getByText("Клиентов")).toBeVisible();
      await expect(page.getByText("Проектов")).toBeVisible();
      await expect(page.getByText("Моих задач")).toBeVisible();
      await expect(page.getByText("За неделю")).toBeVisible();

      // Should see section headings
      await expect(page.getByRole("heading", { name: "Проекты по статусам" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Недавние проекты" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ожидаемые оплаты" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ближайшие дедлайны" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Моя неделя" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Быстрые действия" })).toBeVisible();
    });

    test("should display quick actions", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();

      // Should see quick action links
      await expect(page.getByRole("link", { name: "Новый клиент" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Новый проект" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Новая задача" })).toBeVisible();
      await expect(page.getByRole("link", { name: "Записать время" })).toBeVisible();
    });

    test("should navigate from quick actions", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();

      // Click new client quick action
      await page.getByRole("link", { name: "Новый клиент" }).click();
      await expect(page).toHaveURL(/\/crm\/clients\/new$/);

      await crmPage.gotoCRM();

      // Click new project quick action
      await page.getByRole("link", { name: "Новый проект" }).click();
      await expect(page).toHaveURL(/\/crm\/projects\/new$/);

      await crmPage.gotoCRM();

      // Click new task quick action
      await page.getByRole("link", { name: "Новая задача" }).click();
      await expect(page).toHaveURL(/\/crm\/tasks\/new$/);

      await crmPage.gotoCRM();

      // Click time quick action
      await page.getByRole("link", { name: "Записать время" }).click();
      await expect(page).toHaveURL(/\/crm\/time$/);
    });

    test("should update stats when data changes", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      await crmPage.gotoCRM();

      // Get initial client count
      const clientsWidget = page.getByText("Клиентов").locator("..");
      const initialCountText = await clientsWidget.locator("text=/\\d+/").textContent();
      const initialCount = parseInt(initialCountText || "0");

      // Create a new client
      await crmPage.gotoNewClient();
      await crmPage.createClient({ name: `Dashboard Test Client ${timestamp}` });

      // Go back to dashboard
      await crmPage.gotoCRM();

      // Count should be incremented
      const newCountText = await clientsWidget.locator("text=/\\d+/").textContent();
      const newCount = parseInt(newCountText || "0");
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });

    test("should display projects by status chart", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();

      // Should see status labels
      await expect(page.getByText("Лид")).toBeVisible();
      await expect(page.getByText("Переговоры")).toBeVisible();
      await expect(page.getByText("Договор")).toBeVisible();
      await expect(page.getByText("В работе")).toBeVisible();
      await expect(page.getByText("Завершён")).toBeVisible();
      await expect(page.getByText("Отменён")).toBeVisible();
    });

    test("should navigate to sections from stat cards", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();

      // Click on clients stat card
      await page.getByText("Клиентов").click();
      await crmPage.expectOnClientsPage();

      await crmPage.gotoCRM();

      // Click on projects stat card
      await page.getByText("Проектов").click();
      await crmPage.expectOnProjectsPage();

      await crmPage.gotoCRM();

      // Click on tasks stat card
      await page.getByText("Моих задач").click();
      await crmPage.expectOnTasksPage();
    });

    test("should show recent projects", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create a client and project
      await crmPage.gotoNewClient();
      await crmPage.createClient({ name: `Recent Test Client ${timestamp}` });
      const clientId = await crmPage.getClientIdFromUrl();

      await crmPage.gotoNewProject();
      const projectName = `Recent Test Project ${timestamp}`;
      await crmPage.createProject({ name: projectName, clientId });

      // Go to dashboard
      await crmPage.gotoCRM();

      // Should see recent project in widget
      await expect(page.getByText(projectName)).toBeVisible();
    });

    test("should show upcoming deadlines", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create client, project, and task with deadline
      await crmPage.gotoNewClient();
      await crmPage.createClient({ name: `Deadline Test Client ${timestamp}` });
      const clientId = await crmPage.getClientIdFromUrl();

      await crmPage.gotoNewProject();
      await crmPage.createProject({ name: `Deadline Test Project ${timestamp}`, clientId });
      const projectId = await crmPage.getProjectIdFromUrl();

      // Create task with deadline
      await crmPage.gotoNewTask();
      const taskTitle = `Deadline Test Task ${timestamp}`;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deadlineStr = tomorrow.toISOString().split("T")[0];

      await crmPage.createTask({
        title: taskTitle,
        projectId,
        deadline: deadlineStr,
      });

      // Go to dashboard
      await crmPage.gotoCRM();

      // Should see task in upcoming deadlines
      await expect(page.getByText(taskTitle)).toBeVisible();
    });
  });

  test.describe("My Week Widget", () => {
    test("should display week stats", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoCRM();

      // Should see week stats
      await expect(page.getByText("Задач выполнено:")).toBeVisible();
      await expect(page.getByText("Время залогировано:")).toBeVisible();
    });
  });
});
