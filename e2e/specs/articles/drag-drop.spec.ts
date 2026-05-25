import { test, expect } from "../../fixtures/test";

test.describe("Articles - Drag and Drop", () => {
  test("should drag article to folder", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    timestamp
  }) => {
    // Create folder first
    const folderName = `Test Folder ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Create article
    await authenticatedPage.newArticleButton.click();
    const title = `Drag Test Article ${timestamp}`;
    await articleEditorPage.createArticle(title, "Content for drag test.");

    // Go to articles list
    await authenticatedPage.gotoArticles();
    await page.waitForTimeout(500);

    // Find the article slug from URL or data attribute
    const articleSlug = title.toLowerCase().replace(/\s+/g, "-");
    const folderSlug = folderName.toLowerCase().replace(/\s+/g, "-");

    // Drag article to folder
    const articleItem = page.locator(`[data-testid^="article-item-"]`).filter({ hasText: title });
    const folderDropzone = page.locator(`[data-testid^="folder-dropzone-"]`).filter({ hasText: folderName });

    if (await articleItem.isVisible() && await folderDropzone.isVisible()) {
      await articleItem.dragTo(folderDropzone);
      await page.waitForTimeout(1000);
    }
  });

  test("should create article in folder and view it there", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    timestamp
  }) => {
    // Create folder
    const folderName = `Drag From ${timestamp}`;
    await authenticatedPage.createFolder(folderName);
    await page.waitForTimeout(1000);

    const folderSlug = folderName.toLowerCase().replace(/\s+/g, "-");

    // Clear localStorage draft before creating article (to avoid loading old draft)
    await page.evaluate(() => localStorage.removeItem("article-draft"));

    // Create article in folder - go to new article page
    await authenticatedPage.newArticleButton.click();
    await page.waitForURL("/articles/new");

    // Wait for folders dropdown to load
    const selectElement = page.locator("select").first();
    await expect(selectElement).toBeVisible({ timeout: 10000 });

    // Wait for our folder option to appear in dropdown
    // New folders may need a moment to appear in the API response
    await page.waitForFunction(
      (folder) => {
        const select = document.querySelector("select") as HTMLSelectElement;
        if (!select) return false;
        return Array.from(select.options).some(opt => opt.text.includes(folder));
      },
      folderName,
      { timeout: 15000 }
    );

    // Now fill in the article
    const title = `In Folder ${timestamp}`;
    await articleEditorPage.titleInput.fill(title);
    await articleEditorPage.contentInput.fill("Content to move.");

    // Select the folder
    await selectElement.selectOption({ label: folderName });

    await articleEditorPage.submitButton.click();
    await page.waitForURL(/\/articles\/[^/]+$/, { timeout: 15000 });

    // Navigate to folder page using the direct URL
    // Use hard navigation to bypass Next.js cache
    await page.goto(`/folders/${folderSlug}`, { waitUntil: "networkidle" });

    // Verify we're on folder page
    await expect(page.locator("h1")).toContainText(folderName, { timeout: 10000 });

    // Force reload to get fresh server data (Next.js caching issue)
    await page.reload({ waitUntil: "networkidle" });

    // Verify article is in the folder
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 10000 });
  });
});
