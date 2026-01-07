import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.describe("Sharing", () => {
  test("should share article and open public link", async ({ page, context }) => {
    await login(page, "share");

    // Create article
    await page.locator("header").getByText("Новая статья").click();
    const title = `Shared Article ${Date.now()}`;
    await page.fill('input[placeholder="Заголовок статьи"]', title);
    await page.fill("textarea", "This article will be shared publicly.");
    await page.click('button:has-text("Создать")');
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    // Click share button
    await page.click("text=Поделиться");

    // Modal should appear
    await expect(page.locator("text=Публичная ссылка")).toBeVisible({ timeout: 5000 });

    // Wait for loading to finish
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    // Create link if no active links exist (button appears after loading)
    const createLinkButton = page.locator("button:has-text('Создать ссылку')");
    if (await createLinkButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createLinkButton.click();
      // Wait for loading again
      await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });
    }

    // Get the share link input (look for input inside the modal with link)
    const linkInput = page.locator("input.text-gray-600");
    await expect(linkInput).toBeVisible({ timeout: 5000 });
    const shareLink = await linkInput.inputValue();
    expect(shareLink).toContain("/share/");

    // Open share link in new tab (without auth)
    const newPage = await context.newPage();
    await newPage.goto(shareLink);

    // Should show article content without login
    await expect(newPage.locator("h1")).toContainText(title, { timeout: 10000 });
    await expect(newPage.locator("text=This article will be shared publicly")).toBeVisible();
  });
});
