import { test, expect } from "../../fixtures/test";

test.describe("Sharing", () => {
  test("should share article and open public link", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    context,
    timestamp
  }) => {
    // Create article
    await authenticatedPage.newArticleButton.click();
    const title = `Shared Article ${timestamp}`;
    await articleEditorPage.createArticle(title, "This article will be shared publicly.");
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Click share button
    await page.click("text=Поделиться");

    // Modal should appear
    await expect(page.locator("text=Публичная ссылка")).toBeVisible({ timeout: 5000 });

    // Wait for loading
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    // Create link if needed
    const createLinkButton = page.locator("button:has-text('Создать ссылку')");
    if (await createLinkButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createLinkButton.click();
      await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });
    }

    // Get share link
    const linkInput = page.locator("input.text-gray-600");
    await expect(linkInput).toBeVisible({ timeout: 5000 });
    const shareLink = await linkInput.inputValue();
    expect(shareLink).toContain("/share/");

    // Open share link in new tab
    const newPage = await context.newPage();
    await newPage.goto(shareLink);

    // Should show article without login
    await expect(newPage.locator("h1")).toContainText(title, { timeout: 10000 });
    await expect(newPage.locator("text=This article will be shared publicly")).toBeVisible();
  });
});
