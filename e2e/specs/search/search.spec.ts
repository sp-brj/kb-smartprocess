import { test, expect } from "../../fixtures/test";

test.describe("Search", () => {
  test("should search and find articles", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    timestamp
  }) => {
    // Create article with unique content
    const uniqueKeyword = `uniquekeyword${timestamp}`;
    await authenticatedPage.newArticleButton.click();
    const title = `Searchable Article ${uniqueKeyword}`;
    await articleEditorPage.createArticle(title, `This article contains ${uniqueKeyword} for search testing.`);
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Go to main page
    await page.goto("/");

    // Search
    await authenticatedPage.search(uniqueKeyword);

    // Wait for results
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });

    // Click on result
    await page.click(`text=${title}`);

    // Should navigate to article
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
  });

  test("should show no results message", async ({ authenticatedPage }) => {
    await authenticatedPage.search("nonexistentrandomtext12345");
    await authenticatedPage.expectNoSearchResults();
  });
});
