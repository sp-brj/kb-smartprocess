import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Articles CRUD", () => {
  test("should create a new article", async ({ page }) => {
    await login(page, "articles");

    // Click on "New article" button
    await page.locator("header").getByText("Новая статья").click();
    await expect(page).toHaveURL(/\/articles\/new/);

    // Fill in article details
    const title = `Test Article ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "This is test content for the article.");

    // Save (button text is "Создать" for new articles)
    await page.click('button:has-text("Создать")');

    // Should redirect to article page
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
  });

  test("should create article with Cyrillic title and view it", async ({ page }) => {
    await login(page, "cyrillic");

    await page.locator("header").getByText("Новая статья").click();

    // Create article with Cyrillic title
    const title = `Тестовая статья ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "Контент статьи на русском языке.");

    await page.click('button:has-text("Создать")');

    // Should be on article page (no 404!)
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // URL should be transliterated (not contain Cyrillic characters)
    const url = page.url();
    // Check that URL doesn't contain Cyrillic
    expect(url).not.toMatch(/[а-яё]/i);
    // And contains transliterated base
    expect(url).toMatch(/\/articles\/testovaya-stat/);

    // Now go to home and reopen article to test URL navigation
    await page.goto("/");
    await page.goto(url);

    // Article should still be visible (no 404!)
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
    await expect(page.locator("text=Контент статьи на русском языке")).toBeVisible();
  });

  test("should edit an existing article", async ({ page }) => {
    await login(page, "edit");

    // Create article first
    await page.locator("header").getByText("Новая статья").click();
    const title = `Article to Edit ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "Original content.");
    await page.click('button:has-text("Создать")');
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Click edit
    await page.click("text=Редактировать");
    await expect(page).toHaveURL(/\/edit/);

    // Update content
    await page.fill("textarea", "Updated content!");
    await page.click('button:has-text("Сохранить")');

    // Check updated content
    await expect(page.locator("text=Updated content!")).toBeVisible({ timeout: 10000 });
  });

  test("should delete an article", async ({ page }) => {
    await login(page, "delete");

    // Create article first
    await page.locator("header").getByText("Новая статья").click();
    const title = `Article to Delete ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "This will be deleted.");
    await page.click('button:has-text("Создать")');
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Delete with confirmation
    page.on("dialog", (dialog) => dialog.accept());
    await page.click("text=Удалить");

    // Should redirect away from article page
    await expect(page.locator("h1")).not.toContainText(title, { timeout: 10000 });
  });
});
