import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Search", () => {
  test("should search and find articles", async ({ page }) => {
    await login(page, "search");

    // Create article with unique content
    const uniqueKeyword = `uniquekeyword${Date.now()}`;
    await page.locator("header").getByText("Новая статья").click();
    const title = `Searchable Article ${uniqueKeyword}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", `This article contains ${uniqueKeyword} for search testing.`);
    await page.click('button:has-text("Создать")');
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Go back to main page
    await page.goto("/");

    // Type in search box
    await page.fill('input[placeholder="Поиск..."]', uniqueKeyword);

    // Wait for search results dropdown
    await expect(page.locator(`text=${title}`).first()).toBeVisible({ timeout: 10000 });

    // Click on result
    await page.click(`text=${title}`);

    // Should navigate to article
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });
  });

  test("should show no results message", async ({ page }) => {
    await login(page, "search-empty");

    // Search for non-existent content
    await page.fill('input[placeholder="Поиск..."]', "nonexistentrandomtext12345");

    // Should show "nothing found" message
    await expect(page.locator("text=Ничего не найдено")).toBeVisible({ timeout: 5000 });
  });
});
