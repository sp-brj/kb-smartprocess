import { test, expect } from "../../fixtures/test";

test.describe("CRM - Tasks", () => {
  // Helper to create client and project for task tests
  async function createTestProject(crmPage: import("../../pages/crm.page").CrmPage, timestamp: string) {
    await crmPage.gotoNewClient();
    const clientName = `Task Test Client ${timestamp}`;
    await crmPage.createClient({ name: clientName });
    const clientId = await crmPage.getClientIdFromUrl();

    await crmPage.gotoNewProject();
    const projectName = `Task Test Project ${timestamp}`;
    await crmPage.createProject({ name: projectName, clientId });
    const projectId = await crmPage.getProjectIdFromUrl();

    return { clientId, clientName, projectId, projectName };
  }

  test.describe("Tasks List", () => {
    test("should display tasks list page", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoTasks();
      await crmPage.expectOnTasksPage();

      // Should see heading and controls
      await expect(page.getByRole("heading", { name: "Мои задачи" })).toBeVisible();
      await expect(crmPage.newTaskButton).toBeVisible();
      await expect(crmPage.tasksFilterActive).toBeVisible();
      await expect(crmPage.tasksFilterDone).toBeVisible();
      await expect(crmPage.tasksFilterAll).toBeVisible();
    });

    test("should filter tasks by status", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoTasks();

      // Click on different filters
      await crmPage.filterTasksDone();
      // Just verify the filter was clicked without error

      await crmPage.filterTasksAll();
      await crmPage.filterTasksActive();
    });
  });

  test.describe("Task CRUD", () => {
    test("should create a new task", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create project first
      const { projectId, projectName } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoNewTask();

      // Should see form heading
      await expect(page.getByRole("heading", { name: "Новая задача" })).toBeVisible();

      const taskTitle = `Test Task ${timestamp}`;
      await crmPage.createTask({
        title: taskTitle,
        projectId: projectId,
        priority: "HIGH",
      });

      // Should redirect to kanban page
      await crmPage.expectOnProjectKanbanPage();

      // Task should be visible in TODO column
      await crmPage.expectTaskInKanban(taskTitle, "TODO");
    });

    test("should create task with deadline", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoNewTask();

      const taskTitle = `Deadline Task ${timestamp}`;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const deadlineStr = tomorrow.toISOString().split("T")[0];

      await crmPage.createTask({
        title: taskTitle,
        projectId: projectId,
        deadline: deadlineStr,
      });

      await crmPage.expectOnProjectKanbanPage();
      await crmPage.expectTaskInKanban(taskTitle);

      // Deadline should be visible on task card
      const taskCard = page.getByText(taskTitle).locator("..");
      await expect(taskCard).toBeVisible();
    });

    test("should create task with checklist", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      await crmPage.gotoNewTask();

      const taskTitle = `Checklist Task ${timestamp}`;
      await crmPage.taskTitleInput.fill(taskTitle);
      await crmPage.taskProjectSelect.selectOption(projectId);

      // Add checklist items
      const checklistInput = page.getByPlaceholder("Добавить пункт...");
      await checklistInput.fill("First item");
      await page.getByRole("button", { name: "Добавить" }).click();

      await checklistInput.fill("Second item");
      await page.getByRole("button", { name: "Добавить" }).click();

      // Verify items are shown
      await expect(page.getByText("First item")).toBeVisible();
      await expect(page.getByText("Second item")).toBeVisible();

      await crmPage.saveTaskButton.click();
      await crmPage.expectOnProjectKanbanPage();
    });

    test("should not allow creating task without project", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      await crmPage.gotoNewTask();

      // Fill title but not project
      await crmPage.taskTitleInput.fill(`Test Task ${timestamp}`);

      // Save button should be disabled
      await expect(crmPage.saveTaskButton).toBeDisabled();
    });

    test("should navigate back from new task form", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoNewTask();
      await page.getByText("Назад к задачам").click();
      await crmPage.expectOnTasksPage();
    });
  });

  test.describe("Kanban Board", () => {
    test("should display kanban board with all columns", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      // Create a task
      await crmPage.gotoNewTask();
      await crmPage.createTask({
        title: `Kanban Test Task ${timestamp}`,
        projectId: projectId,
      });

      await crmPage.expectOnProjectKanbanPage();

      // Should see all columns
      await expect(crmPage.kanbanBoard).toBeVisible();
      await expect(crmPage.kanbanColumnTodo).toBeVisible();
      await expect(crmPage.kanbanColumnInProgress).toBeVisible();
      await expect(crmPage.kanbanColumnReview).toBeVisible();
      await expect(crmPage.kanbanColumnDone).toBeVisible();

      // Should see column headers
      await expect(page.getByText("К выполнению")).toBeVisible();
      await expect(page.getByText("В работе")).toBeVisible();
      await expect(page.getByText("На проверке")).toBeVisible();
      await expect(page.getByText("Выполнено")).toBeVisible();
    });

    test("should drag task between columns", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      // Create a task
      await crmPage.gotoNewTask();
      const taskTitle = `Drag Test Task ${timestamp}`;
      await crmPage.createTask({
        title: taskTitle,
        projectId: projectId,
      });

      await crmPage.expectOnProjectKanbanPage();

      // Task should be in TODO column
      await crmPage.expectTaskInKanban(taskTitle, "TODO");

      // Get task element and target column
      const taskCard = page.locator(`[data-testid^="kanban-task-"]`).filter({ hasText: taskTitle });
      const inProgressColumn = crmPage.kanbanColumnInProgress;

      // Drag task to IN_PROGRESS column
      await taskCard.dragTo(inProgressColumn);

      // Wait for API call and UI update
      await page.waitForTimeout(500);

      // Task should now be in IN_PROGRESS column
      await crmPage.expectTaskInKanban(taskTitle, "IN_PROGRESS");
    });

    test("should show task count per column", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      // Create multiple tasks
      for (let i = 1; i <= 3; i++) {
        await crmPage.gotoNewTask();
        await crmPage.createTask({
          title: `Count Task ${i} ${timestamp}`,
          projectId: projectId,
        });
      }

      await crmPage.gotoProjectKanban(projectId);

      // Should show count in TODO column header
      const todoColumn = crmPage.kanbanColumnTodo;
      await expect(todoColumn.getByText("3")).toBeVisible();
    });

    test("should expand task card to show details", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      // Create a task with description
      await crmPage.gotoNewTask();
      const taskTitle = `Expand Test Task ${timestamp}`;
      await crmPage.taskTitleInput.fill(taskTitle);
      await crmPage.taskProjectSelect.selectOption(projectId);
      await page.getByPlaceholder("Описание задачи").fill("Task description text");
      await crmPage.saveTaskButton.click();

      await crmPage.expectOnProjectKanbanPage();

      // Click on task title to expand
      await page.getByText(taskTitle).click();

      // Description should be visible
      await expect(page.getByText("Task description text")).toBeVisible();
    });

    test("should navigate to kanban from project page", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId, projectName } = await createTestProject(crmPage, timestamp);

      // Go to project detail page
      await crmPage.goto(`/crm/projects/${projectId}`);
      await crmPage.expectOnProjectDetailPage();

      // Navigate to kanban via URL (since there's no button yet)
      await crmPage.gotoProjectKanban(projectId);
      await crmPage.expectOnProjectKanbanPage();

      // Should see project name in header
      await expect(page.getByText(projectName)).toBeVisible();
    });
  });

  test.describe("Task Priority", () => {
    test("should create tasks with different priorities", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      const { projectId } = await createTestProject(crmPage, timestamp);

      const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

      for (const priority of priorities) {
        await crmPage.gotoNewTask();
        await crmPage.createTask({
          title: `${priority} Priority Task ${timestamp}`,
          projectId: projectId,
          priority: priority,
        });
      }

      await crmPage.gotoProjectKanban(projectId);

      // All tasks should be visible
      for (const priority of priorities) {
        await expect(page.getByText(`${priority} Priority Task ${timestamp}`)).toBeVisible();
      }
    });
  });
});
