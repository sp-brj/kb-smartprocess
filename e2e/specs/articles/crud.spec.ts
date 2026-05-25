import { test, expect } from "../../fixtures/test";

test.describe("Articles CRUD", () => {
  test("should create a new article", async ({ authenticatedPage, articleEditorPage, page, timestamp }) => {
    await authenticatedPage.newArticleButton.click();
    await expect(page).toHaveURL(/\/articles\/new/);

    const title = `Test Article ${timestamp}`;
    await articleEditorPage.createArticle(title, "This is test content for the article.");

    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
  });

  test("should create article with Cyrillic title and view it", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    timestamp
  }) => {
    await authenticatedPage.newArticleButton.click();

    const title = `Тестовая статья ${timestamp}`;
    await articleEditorPage.createArticle(title, "Контент статьи на русском языке.");

    // Should be on article page
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // URL should be transliterated
    const url = page.url();
    expect(url).not.toMatch(/[а-яё]/i);
    expect(url).toMatch(/\/articles\/testovaya-stat/);

    // Navigate away and back to test URL
    await page.goto("/");
    await page.goto(url);

    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
    await expect(page.locator("text=Контент статьи на русском языке")).toBeVisible();
  });

  test("should edit an existing article", async ({
    authenticatedPage,
    articleEditorPage,
    articleViewPage,
    page,
    timestamp
  }) => {
    // Create article
    await authenticatedPage.newArticleButton.click();
    const title = `Article to Edit ${timestamp}`;
    await articleEditorPage.createArticle(title, "Original content.");
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Edit article
    await articleViewPage.edit();
    await articleEditorPage.contentInput.fill("Updated content!");
    await articleEditorPage.submitButton.click();

    // Check updated content
    await expect(page.locator("text=Updated content!")).toBeVisible({ timeout: 10000 });
  });

  test("should delete an article", async ({
    authenticatedPage,
    articleEditorPage,
    articleViewPage,
    page,
    timestamp
  }) => {
    // Create article
    await authenticatedPage.newArticleButton.click();
    const title = `Article to Delete ${timestamp}`;
    await articleEditorPage.createArticle(title, "This will be deleted.");
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Delete with confirmation
    page.on("dialog", (dialog) => dialog.accept());
    await articleViewPage.delete();

    // Should redirect away
    await expect(page.locator("h1")).not.toContainText(title, { timeout: 10000 });
  });
});
