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
    await expect(page.locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should create article inside folder", async ({ page }) => {
    await login(page, "folder-art");

    // Create folder
    await page.click("text=+ Новая");
    const folderName = `Folder for Article ${Date.now()}`;
    await page.fill('input[placeholder="Название папки"]', folderName);
    await page.click('button:has-text("Создать")');
    await expect(page.locator(`text=${folderName}`)).toBeVisible({ timeout: 10000 });

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
  });
});
