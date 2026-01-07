import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Folders", () => {
  test("should create a new folder", async ({ page }) => {
    await login(page, "folders");

    // Click on "New folder" button in sidebar (button text is "+ Новая")
    await page.click("text=+ Новая");

    // Fill in folder name in input
    const folderName = `Test Folder ${Date.now()}`;
    await page.fill('input[placeholder="Название папки"]', folderName);
    await page.click('button:has-text("Создать")');

    // Folder should appear in sidebar
    await expect(page.locator(`text=${folderName}`)).toBeVisible({
      timeout: 10000,
    });
  });

  test("should navigate to folder page when clicking folder", async ({
    page,
  }) => {
    await login(page, "folders-nav");

    // Create folder
    await page.click("text=+ Новая");
    const folderName = `Nav Folder ${Date.now()}`;
    await page.fill('input[placeholder="Название папки"]', folderName);
    await page.click('button:has-text("Создать")');
    await expect(page.locator(`text=${folderName}`)).toBeVisible({
      timeout: 10000,
    });

    // Click on the folder in sidebar
    await page.click(`text=${folderName}`);

    // Should navigate to folder page and show folder name as title
    await expect(page.locator("h1")).toContainText(folderName, {
      timeout: 10000,
    });

    // Should show empty state message
    await expect(page.locator("text=В этой папке пока нет статей")).toBeVisible(
      { timeout: 5000 }
    );
  });

  test("should show articles in folder page", async ({ page }) => {
    await login(page, "folder-art");

    // Create folder
    await page.click("text=+ Новая");
    const folderName = `Folder for Article ${Date.now()}`;
    await page.fill('input[placeholder="Название папки"]', folderName);
    await page.click('button:has-text("Создать")');
    await expect(page.locator(`text=${folderName}`)).toBeVisible({
      timeout: 10000,
    });

    // Create new article and select this folder
    await page.locator("header").getByText("Новая статья").click();
    const title = `Article in Folder ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "Content inside folder.");

    // Select the folder from dropdown
    await page.selectOption("select", { label: folderName });

    await page.click('button:has-text("Создать")');

    // Article should show
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Now navigate to folder page via sidebar
    await page.click(`aside >> text=${folderName}`);

    // Folder page should show the article
    await expect(page.locator("h1")).toContainText(folderName, {
      timeout: 10000,
    });
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 5000 });
  });
});
