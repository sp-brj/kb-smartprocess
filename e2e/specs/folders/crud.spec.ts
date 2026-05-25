import { test, expect } from "../../fixtures/test";

test.describe("Folders CRUD", () => {
  test("should create a new folder", async ({ authenticatedPage, timestamp }) => {
    const folderName = `Test Folder ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Folder should appear in sidebar
    await expect(authenticatedPage.page.locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should navigate to folder page when clicking folder", async ({
    authenticatedPage,
    page,
    timestamp
  }) => {
    const folderName = `Nav Folder ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Click on folder
    await page.click(`text=${folderName}`);

    // Should show folder name as title
    await expect(page.locator("h1")).toContainText(folderName, { timeout: 10000 });

    // Should show empty state
    await expect(page.locator("text=В этой папке пока нет статей")).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to folder page with Cyrillic name", async ({
    authenticatedPage,
    page,
    timestamp
  }) => {
    const folderName = `Тестовая Папка ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Click on folder
    await page.click(`text=${folderName}`);

    // Should show folder name
    await expect(page.locator("h1")).toContainText(folderName, { timeout: 10000 });

    // URL should contain folder path
    await expect(page).toHaveURL(/\/folders\//);
  });

  test("should show articles in folder page", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    timestamp
  }) => {
    // Create folder
    const folderName = `Folder for Article ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Create article in folder
    await authenticatedPage.newArticleButton.click();
    const title = `Article in Folder ${timestamp}`;
    await articleEditorPage.titleInput.fill(title);
    await articleEditorPage.contentInput.fill("Content inside folder.");

    // Select folder
    await page.selectOption("select", { label: folderName });
    await articleEditorPage.submitButton.click();

    // Article should show
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Navigate to folder
    await page.click(`aside >> text=${folderName}`);

    // Folder page should show article
    await expect(page.locator("h1")).toContainText(folderName, { timeout: 10000 });
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 5000 });
  });
});
