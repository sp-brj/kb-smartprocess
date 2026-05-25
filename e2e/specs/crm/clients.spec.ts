import { test, expect } from "../../fixtures/test";

test.describe("CRM - Clients", () => {
  test.describe("Client List", () => {
    test("should display clients list page", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoClients();
      await crmPage.expectOnClientsPage();

      // Should see heading and new client button
      await expect(page.getByRole("heading", { name: "Клиенты" })).toBeVisible();
      await expect(crmPage.newClientButton).toBeVisible();

      // Should see search and filter controls
      await expect(crmPage.clientsSearch).toBeVisible();
      await expect(crmPage.clientsStatusFilter).toBeVisible();
    });

    test("should search clients", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // First create a client to search for
      await crmPage.gotoNewClient();
      const clientName = `SearchTest Client ${timestamp}`;
      await crmPage.createClient({ name: clientName, inn: "1234567890" });
      await crmPage.expectOnClientDetailPage();

      // Go to clients list and search
      await crmPage.gotoClients();
      await crmPage.searchClients("SearchTest");

      // Should find the client
      await crmPage.expectClientInTable(clientName);

      // Search by INN
      await crmPage.searchClients("1234567890");
      await crmPage.expectClientInTable(clientName);

      // Search for non-existent client
      await crmPage.searchClients("NonExistentClient12345");
      await expect(page.getByText("Клиенты не найдены")).toBeVisible();
    });

    test("should filter clients by status", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoClients();

      // Filter by Active
      await crmPage.filterClientsByStatus("ACTIVE");
      // Should not show "Все статусы" as selected
      await expect(crmPage.clientsStatusFilter).toHaveValue("ACTIVE");

      // Filter by Archived
      await crmPage.filterClientsByStatus("ARCHIVED");
      await expect(crmPage.clientsStatusFilter).toHaveValue("ARCHIVED");

      // Reset filter
      await crmPage.filterClientsByStatus("");
      await expect(crmPage.clientsStatusFilter).toHaveValue("");
    });
  });

  test.describe("Client CRUD", () => {
    test("should create a new client with all fields", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      await crmPage.gotoNewClient();

      // Should see form heading
      await expect(page.getByRole("heading", { name: "Новый клиент" })).toBeVisible();

      const clientData = {
        name: `Full Test Client ${timestamp}`,
        inn: "9876543210",
        kpp: "123456789",
        ogrn: "1234567890123",
        legalAddress: "г. Москва, ул. Тестовая, д. 1",
        actualAddress: "г. Москва, ул. Фактическая, д. 2",
        notes: "Тестовые заметки для клиента",
      };

      await crmPage.createClient(clientData);

      // Should redirect to client detail page
      await crmPage.expectOnClientDetailPage();

      // Should display client info
      await expect(page.getByRole("heading", { name: clientData.name })).toBeVisible();
      await expect(page.getByText(clientData.inn)).toBeVisible();
    });

    test("should create a client with minimal data", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      await crmPage.gotoNewClient();

      const clientName = `Minimal Client ${timestamp}`;
      await crmPage.createClient({ name: clientName });

      // Should redirect to client detail page
      await crmPage.expectOnClientDetailPage();
      await expect(page.getByRole("heading", { name: clientName })).toBeVisible();
    });

    test("should not allow creating client without name", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoNewClient();

      // Save button should be disabled without name
      await expect(crmPage.saveClientButton).toBeDisabled();

      // Fill INN but not name
      await crmPage.clientInnInput.fill("1234567890");
      await expect(crmPage.saveClientButton).toBeDisabled();

      // Fill name - button should be enabled
      await crmPage.clientNameInput.fill("Test Client");
      await expect(crmPage.saveClientButton).toBeEnabled();
    });

    test("should navigate back from new client form", async ({ authenticatedPage, crmPage, page }) => {
      await crmPage.gotoNewClient();

      // Click back link
      await page.getByText("Назад к списку").click();

      // Should be on clients list
      await crmPage.expectOnClientsPage();
    });

    test("should view client details", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create a client first
      await crmPage.gotoNewClient();
      const clientName = `Detail View Client ${timestamp}`;
      await crmPage.createClient({
        name: clientName,
        inn: "5555555555",
        notes: "Some test notes"
      });
      await crmPage.expectOnClientDetailPage();

      // Check client details are displayed
      await expect(page.getByRole("heading", { name: clientName })).toBeVisible();
      await expect(page.getByText("5555555555")).toBeVisible();

      // Should see action buttons
      await expect(page.getByRole("link", { name: "Редактировать" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Удалить" })).toBeVisible();
    });

    test("should edit client", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create a client first
      await crmPage.gotoNewClient();
      const originalName = `Edit Test Client ${timestamp}`;
      await crmPage.createClient({ name: originalName });
      await crmPage.expectOnClientDetailPage();

      // Click edit
      await page.getByRole("link", { name: "Редактировать" }).click();
      await expect(page).toHaveURL(/\/crm\/clients\/[^/]+\/edit$/);

      // Update the name
      const newName = `Updated Client ${timestamp}`;
      await crmPage.clientNameInput.fill(newName);
      await crmPage.saveClientButton.click();

      // Should redirect to detail page with new name
      await crmPage.expectOnClientDetailPage();
      await expect(page.getByRole("heading", { name: newName })).toBeVisible();
    });

    test("should delete client", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create a client first
      await crmPage.gotoNewClient();
      const clientName = `Delete Test Client ${timestamp}`;
      await crmPage.createClient({ name: clientName });
      await crmPage.expectOnClientDetailPage();

      // Set up dialog handler
      page.on("dialog", (dialog) => dialog.accept());

      // Click delete
      await page.getByRole("button", { name: "Удалить" }).click();

      // Should redirect to clients list
      await crmPage.expectOnClientsPage();

      // Client should not be in list
      await crmPage.searchClients(clientName);
      await expect(page.getByText("Клиенты не найдены")).toBeVisible();
    });
  });

  test.describe("Client Contacts", () => {
    test("should add contact to client", async ({ authenticatedPage, crmPage, page, timestamp }) => {
      // Create a client first
      await crmPage.gotoNewClient();
      const clientName = `Contact Test Client ${timestamp}`;
      await crmPage.createClient({ name: clientName });
      await crmPage.expectOnClientDetailPage();

      // Click add contact
      await page.getByText("+ Добавить контакт").click();

      // Fill contact form
      await page.getByTestId("contact-name-input").fill("Иван Тестов");
      await page.getByTestId("contact-position-input").fill("Директор");
      await page.getByTestId("contact-phone-input").fill("+7 999 123 45 67");
      await page.getByTestId("contact-email-input").fill("ivan@test.com");
      await page.getByTestId("save-contact-button").click();

      // Contact should appear in list
      await expect(page.getByText("Иван Тестов")).toBeVisible();
      await expect(page.getByText("Директор")).toBeVisible();
    });
  });
});
