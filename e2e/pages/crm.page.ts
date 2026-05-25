import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class CrmPage extends BasePage {
  // Header module switcher
  readonly kbLink: Locator;
  readonly crmLink: Locator;

  // CRM navigation
  readonly navOverview: Locator;
  readonly navClients: Locator;
  readonly navProjects: Locator;
  readonly navTasks: Locator;
  readonly navTime: Locator;
  readonly navSettings: Locator;

  // Breadcrumbs
  readonly breadcrumbs: Locator;

  // Clients page
  readonly newClientButton: Locator;
  readonly clientsSearch: Locator;
  readonly clientsStatusFilter: Locator;
  readonly clientsTable: Locator;

  // Client form
  readonly clientNameInput: Locator;
  readonly clientInnInput: Locator;
  readonly clientKppInput: Locator;
  readonly clientOgrnInput: Locator;
  readonly clientLegalAddressInput: Locator;
  readonly clientActualAddressInput: Locator;
  readonly clientNotesInput: Locator;
  readonly saveClientButton: Locator;

  // Client detail page
  readonly editClientButton: Locator;
  readonly deleteClientButton: Locator;
  readonly addContactButton: Locator;
  readonly addBankAccountButton: Locator;

  // Projects page
  readonly newProjectButton: Locator;
  readonly projectsSearch: Locator;
  readonly projectsTableView: Locator;
  readonly projectsFunnelView: Locator;

  // Project form
  readonly projectNameInput: Locator;
  readonly projectClientSelect: Locator;
  readonly projectTypeSelect: Locator;
  readonly projectStatusSelect: Locator;
  readonly projectBudgetInput: Locator;
  readonly projectDescriptionInput: Locator;
  readonly projectPlannedStartInput: Locator;
  readonly projectPlannedEndInput: Locator;
  readonly saveProjectButton: Locator;

  // Project detail page
  readonly projectKanbanLink: Locator;
  readonly addTaskButton: Locator;
  readonly addPaymentButton: Locator;

  // Tasks page
  readonly newTaskButton: Locator;
  readonly tasksFilterActive: Locator;
  readonly tasksFilterDone: Locator;
  readonly tasksFilterAll: Locator;

  // Task form
  readonly taskTitleInput: Locator;
  readonly taskProjectSelect: Locator;
  readonly taskPrioritySelect: Locator;
  readonly taskStatusSelect: Locator;
  readonly taskAssigneeSelect: Locator;
  readonly taskDeadlineInput: Locator;
  readonly taskDescriptionInput: Locator;
  readonly saveTaskButton: Locator;

  // Kanban
  readonly kanbanBoard: Locator;
  readonly kanbanColumnTodo: Locator;
  readonly kanbanColumnInProgress: Locator;
  readonly kanbanColumnReview: Locator;
  readonly kanbanColumnDone: Locator;

  // Time page
  readonly newTimeEntryButton: Locator;
  readonly timeEntryProjectSelect: Locator;
  readonly timeEntryTaskSelect: Locator;
  readonly timeEntryMinutesInput: Locator;
  readonly timeEntryWorkTypeSelect: Locator;
  readonly timeEntryDescriptionInput: Locator;
  readonly saveTimeEntryButton: Locator;
  readonly timeReportLink: Locator;

  // Dashboard widgets
  readonly dashboardClientsWidget: Locator;
  readonly dashboardProjectsWidget: Locator;
  readonly dashboardTasksWidget: Locator;
  readonly dashboardTimeWidget: Locator;

  constructor(page: Page) {
    super(page);

    // Header module switcher
    this.kbLink = page.getByTestId("kb-link");
    this.crmLink = page.getByTestId("crm-link");

    // CRM navigation tabs
    this.navOverview = page.getByTestId("crm-nav-crm");
    this.navClients = page.getByTestId("crm-nav-clients");
    this.navProjects = page.getByTestId("crm-nav-projects");
    this.navTasks = page.getByTestId("crm-nav-tasks");
    this.navTime = page.getByTestId("crm-nav-time");
    this.navSettings = page.getByTestId("crm-nav-statuses");

    // Breadcrumbs
    this.breadcrumbs = page.getByTestId("crm-breadcrumbs");

    // Clients page
    this.newClientButton = page.getByTestId("new-client-button");
    this.clientsSearch = page.getByTestId("clients-search");
    this.clientsStatusFilter = page.getByTestId("clients-status-filter");
    this.clientsTable = page.locator("table");

    // Client form
    this.clientNameInput = page.getByTestId("client-name-input");
    this.clientInnInput = page.getByTestId("client-inn-input");
    this.clientKppInput = page.getByTestId("client-kpp-input");
    this.clientOgrnInput = page.getByTestId("client-ogrn-input");
    this.clientLegalAddressInput = page.getByTestId("client-legal-address-input");
    this.clientActualAddressInput = page.getByTestId("client-actual-address-input");
    this.clientNotesInput = page.getByTestId("client-notes-input");
    this.saveClientButton = page.getByTestId("save-client-button");

    // Client detail page
    this.editClientButton = page.getByTestId("edit-client-button");
    this.deleteClientButton = page.getByTestId("delete-client-button");
    this.addContactButton = page.getByTestId("add-contact-button");
    this.addBankAccountButton = page.getByTestId("add-bank-account-button");

    // Projects page
    this.newProjectButton = page.getByTestId("new-project-button");
    this.projectsSearch = page.getByTestId("projects-search");
    this.projectsTableView = page.getByTestId("projects-table-view");
    this.projectsFunnelView = page.getByTestId("projects-funnel-view");

    // Project form
    this.projectNameInput = page.getByTestId("project-name-input");
    this.projectClientSelect = page.getByTestId("project-client-select");
    this.projectTypeSelect = page.getByTestId("project-type-select");
    this.projectStatusSelect = page.getByTestId("project-status-select");
    this.projectBudgetInput = page.getByTestId("project-budget-input");
    this.projectDescriptionInput = page.getByTestId("project-description-input");
    this.projectPlannedStartInput = page.getByTestId("project-planned-start-input");
    this.projectPlannedEndInput = page.getByTestId("project-planned-end-input");
    this.saveProjectButton = page.getByTestId("save-project-button");

    // Project detail page
    this.projectKanbanLink = page.getByTestId("project-kanban-link");
    this.addTaskButton = page.getByTestId("add-task-button");
    this.addPaymentButton = page.getByTestId("add-payment-button");

    // Tasks page
    this.newTaskButton = page.getByTestId("new-task-button");
    this.tasksFilterActive = page.getByTestId("tasks-filter-active");
    this.tasksFilterDone = page.getByTestId("tasks-filter-done");
    this.tasksFilterAll = page.getByTestId("tasks-filter-all");

    // Task form
    this.taskTitleInput = page.getByTestId("task-title-input");
    this.taskProjectSelect = page.getByTestId("task-project-select");
    this.taskPrioritySelect = page.getByTestId("task-priority-select");
    this.taskStatusSelect = page.getByTestId("task-status-select");
    this.taskAssigneeSelect = page.getByTestId("task-assignee-select");
    this.taskDeadlineInput = page.getByTestId("task-deadline-input");
    this.taskDescriptionInput = page.getByTestId("task-description-input");
    this.saveTaskButton = page.getByTestId("save-task-button");

    // Kanban
    this.kanbanBoard = page.getByTestId("kanban-board");
    this.kanbanColumnTodo = page.getByTestId("kanban-column-TODO");
    this.kanbanColumnInProgress = page.getByTestId("kanban-column-IN_PROGRESS");
    this.kanbanColumnReview = page.getByTestId("kanban-column-REVIEW");
    this.kanbanColumnDone = page.getByTestId("kanban-column-DONE");

    // Time page
    this.newTimeEntryButton = page.getByTestId("new-time-entry-button");
    this.timeEntryProjectSelect = page.getByTestId("time-entry-project-select");
    this.timeEntryTaskSelect = page.getByTestId("time-entry-task-select");
    this.timeEntryMinutesInput = page.getByTestId("time-entry-minutes-input");
    this.timeEntryWorkTypeSelect = page.getByTestId("time-entry-work-type-select");
    this.timeEntryDescriptionInput = page.getByTestId("time-entry-description-input");
    this.saveTimeEntryButton = page.getByTestId("save-time-entry-button");
    this.timeReportLink = page.getByTestId("time-report-link");

    // Dashboard widgets
    this.dashboardClientsWidget = page.getByTestId("dashboard-clients-widget");
    this.dashboardProjectsWidget = page.getByTestId("dashboard-projects-widget");
    this.dashboardTasksWidget = page.getByTestId("dashboard-tasks-widget");
    this.dashboardTimeWidget = page.getByTestId("dashboard-time-widget");
  }

  // Navigation methods
  async gotoCRM() {
    await this.goto("/crm");
  }

  async gotoClients() {
    await this.goto("/crm/clients");
  }

  async gotoNewClient() {
    await this.goto("/crm/clients/new");
  }

  async gotoProjects() {
    await this.goto("/crm/projects");
  }

  async gotoNewProject() {
    await this.goto("/crm/projects/new");
  }

  async gotoTasks() {
    await this.goto("/crm/tasks");
  }

  async gotoNewTask() {
    await this.goto("/crm/tasks/new");
  }

  async gotoTime() {
    await this.goto("/crm/time");
  }

  async gotoTimeReport() {
    await this.goto("/crm/time/report");
  }

  async gotoSettings() {
    await this.goto("/crm/settings/statuses");
  }

  async gotoProjectKanban(projectId: string) {
    await this.goto(`/crm/projects/${projectId}/kanban`);
  }

  // Client methods
  async createClient(data: {
    name: string;
    inn?: string;
    kpp?: string;
    ogrn?: string;
    legalAddress?: string;
    actualAddress?: string;
    notes?: string;
  }) {
    await this.clientNameInput.fill(data.name);
    if (data.inn) await this.clientInnInput.fill(data.inn);
    if (data.kpp) await this.clientKppInput.fill(data.kpp);
    if (data.ogrn) await this.clientOgrnInput.fill(data.ogrn);
    if (data.legalAddress) await this.clientLegalAddressInput.fill(data.legalAddress);
    if (data.actualAddress) await this.clientActualAddressInput.fill(data.actualAddress);
    if (data.notes) await this.clientNotesInput.fill(data.notes);
    await this.saveClientButton.click();
  }

  async searchClients(query: string) {
    await this.clientsSearch.fill(query);
    // Wait for debounce
    await this.page.waitForTimeout(400);
  }

  async filterClientsByStatus(status: "" | "ACTIVE" | "ARCHIVED") {
    await this.clientsStatusFilter.selectOption(status);
  }

  // Project methods
  async createProject(data: {
    name: string;
    clientId?: string;
    type?: string;
    statusId?: string;
    budget?: string;
    description?: string;
    plannedStart?: string;
    plannedEnd?: string;
  }) {
    await this.projectNameInput.fill(data.name);
    if (data.clientId) await this.projectClientSelect.selectOption(data.clientId);
    if (data.type) await this.projectTypeSelect.selectOption(data.type);
    if (data.statusId) await this.projectStatusSelect.selectOption(data.statusId);
    if (data.budget) await this.projectBudgetInput.fill(data.budget);
    if (data.description) await this.projectDescriptionInput.fill(data.description);
    if (data.plannedStart) await this.projectPlannedStartInput.fill(data.plannedStart);
    if (data.plannedEnd) await this.projectPlannedEndInput.fill(data.plannedEnd);
    await this.saveProjectButton.click();
  }

  async searchProjects(query: string) {
    await this.projectsSearch.fill(query);
    await this.page.waitForTimeout(400);
  }

  async switchToFunnelView() {
    await this.projectsFunnelView.click();
  }

  async switchToTableView() {
    await this.projectsTableView.click();
  }

  // Task methods
  async createTask(data: {
    title: string;
    projectId?: string;
    priority?: string;
    status?: string;
    assigneeId?: string;
    deadline?: string;
    description?: string;
  }) {
    await this.taskTitleInput.fill(data.title);
    if (data.projectId) await this.taskProjectSelect.selectOption(data.projectId);
    if (data.priority) await this.taskPrioritySelect.selectOption(data.priority);
    if (data.status) await this.taskStatusSelect.selectOption(data.status);
    if (data.assigneeId) await this.taskAssigneeSelect.selectOption(data.assigneeId);
    if (data.deadline) await this.taskDeadlineInput.fill(data.deadline);
    if (data.description) await this.taskDescriptionInput.fill(data.description);
    await this.saveTaskButton.click();
  }

  async filterTasksActive() {
    await this.tasksFilterActive.click();
  }

  async filterTasksDone() {
    await this.tasksFilterDone.click();
  }

  async filterTasksAll() {
    await this.tasksFilterAll.click();
  }

  // Kanban drag & drop
  async dragTaskToColumn(taskTestId: string, targetColumn: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") {
    const task = this.page.getByTestId(taskTestId);
    const column = this.page.getByTestId(`kanban-column-${targetColumn}`);
    await task.dragTo(column);
  }

  async getTasksInColumn(column: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") {
    const columnLocator = this.page.getByTestId(`kanban-column-${column}`);
    return columnLocator.locator('[data-testid^="kanban-task-"]');
  }

  // Time entry methods
  async createTimeEntry(data: {
    projectId: string;
    taskId?: string;
    minutes: string;
    workType?: string;
    description?: string;
  }) {
    await this.timeEntryProjectSelect.selectOption(data.projectId);
    if (data.taskId) await this.timeEntryTaskSelect.selectOption(data.taskId);
    await this.timeEntryMinutesInput.fill(data.minutes);
    if (data.workType) await this.timeEntryWorkTypeSelect.selectOption(data.workType);
    if (data.description) await this.timeEntryDescriptionInput.fill(data.description);
    await this.saveTimeEntryButton.click();
  }

  // Expectations
  async expectOnCRMDashboard() {
    await expect(this.page).toHaveURL(/\/crm$/);
    await expect(this.page.getByRole("heading", { name: "CRM" })).toBeVisible();
  }

  async expectOnClientsPage() {
    await expect(this.page).toHaveURL(/\/crm\/clients/);
  }

  async expectOnProjectsPage() {
    await expect(this.page).toHaveURL(/\/crm\/projects/);
  }

  async expectOnTasksPage() {
    await expect(this.page).toHaveURL(/\/crm\/tasks/);
  }

  async expectOnTimePage() {
    await expect(this.page).toHaveURL(/\/crm\/time/);
  }

  async expectOnSettingsPage() {
    await expect(this.page).toHaveURL(/\/crm\/settings\/statuses/);
  }

  async expectOnClientDetailPage(clientId?: string) {
    if (clientId) {
      await expect(this.page).toHaveURL(new RegExp(`/crm/clients/${clientId}$`));
    } else {
      await expect(this.page).toHaveURL(/\/crm\/clients\/[^/]+$/);
    }
  }

  async expectOnProjectDetailPage(projectId?: string) {
    if (projectId) {
      await expect(this.page).toHaveURL(new RegExp(`/crm/projects/${projectId}$`));
    } else {
      await expect(this.page).toHaveURL(/\/crm\/projects\/[^/]+$/);
    }
  }

  async expectOnProjectKanbanPage(projectId?: string) {
    if (projectId) {
      await expect(this.page).toHaveURL(new RegExp(`/crm/projects/${projectId}/kanban$`));
    } else {
      await expect(this.page).toHaveURL(/\/crm\/projects\/[^/]+\/kanban$/);
    }
  }

  async expectModuleSwitcherVisible() {
    await expect(this.kbLink).toBeVisible();
    await expect(this.crmLink).toBeVisible();
  }

  async expectCRMModuleActive() {
    await expect(this.crmLink).toHaveClass(/bg-primary/);
  }

  async expectKBModuleActive() {
    await expect(this.kbLink).toHaveClass(/bg-primary/);
  }

  async expectClientInTable(clientName: string) {
    await expect(this.page.getByRole("link", { name: clientName })).toBeVisible();
  }

  async expectProjectInTable(projectName: string) {
    await expect(this.page.getByRole("link", { name: projectName })).toBeVisible();
  }

  async expectTaskInKanban(taskTitle: string, column?: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE") {
    if (column) {
      const columnLocator = this.page.getByTestId(`kanban-column-${column}`);
      await expect(columnLocator.getByText(taskTitle)).toBeVisible();
    } else {
      await expect(this.page.getByText(taskTitle)).toBeVisible();
    }
  }

  async expectDashboardWidgetsVisible() {
    await expect(this.page.getByText("Клиентов")).toBeVisible();
    await expect(this.page.getByText("Проектов")).toBeVisible();
    await expect(this.page.getByText("Моих задач")).toBeVisible();
  }

  // Helper to get client ID from URL
  async getClientIdFromUrl(): Promise<string> {
    const url = this.page.url();
    const match = url.match(/\/crm\/clients\/([^/]+)/);
    return match ? match[1] : "";
  }

  // Helper to get project ID from URL
  async getProjectIdFromUrl(): Promise<string> {
    const url = this.page.url();
    const match = url.match(/\/crm\/projects\/([^/]+)/);
    return match ? match[1] : "";
  }
}
