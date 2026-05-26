import { test, expect } from "../../fixtures/test";

test.describe("Folder rename", () => {
  test("should rename folder via context menu", async ({ authenticatedPage, page, timestamp }) => {
    const originalName = `Rename Test ${timestamp}`;
    await authenticatedPage.createFolder(originalName);

    const originalSlug = originalName.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

    // Right-click on folder to open context menu
    await page.locator(`[data-testid="folder-dropzone-${originalSlug}"]`).click({ button: "right" });
    await page.locator(`[data-testid="rename-folder-${originalSlug}"]`).click();

    // Rename input should appear with current name
    const input = page.locator(`[data-testid="rename-folder-input-${originalSlug}"]`);
    await expect(input).toBeVisible();
    await expect(input).toHaveValue(originalName);

    // Type new name and submit
    const newName = `Renamed Folder ${timestamp}`;
    await input.fill(newName);
    await input.press("Enter");

    await page.waitForTimeout(800);

    // Folder with new name should appear in sidebar
    await expect(page.locator(`text=${newName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should cancel rename on Escape", async ({ authenticatedPage, page, timestamp }) => {
    const folderName = `Escape Test ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    const slug = folderName.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");

    await page.locator(`[data-testid="folder-dropzone-${slug}"]`).click({ button: "right" });
    await page.locator(`[data-testid="rename-folder-${slug}"]`).click();

    const input = page.locator(`[data-testid="rename-folder-input-${slug}"]`);
    await expect(input).toBeVisible();

    await input.fill("Something else");
    await input.press("Escape");

    await page.waitForTimeout(300);

    // Original name should still be visible
    await expect(page.locator(`text=${folderName}`)).toBeVisible();
  });

  test("should redirect when renaming current folder", async ({ authenticatedPage, page, timestamp }) => {
    const folderName = `Redirect Test ${timestamp}`;
    await authenticatedPage.createFolder(folderName);

    // Navigate to folder page
    await page.locator(`text=${folderName}`).click();
    await expect(page).toHaveURL(/\/folders\//, { timeout: 10000 });

    const currentUrl = page.url();
    const slug = currentUrl.split("/folders/")[1];

    // Rename from sidebar
    await page.locator(`[data-testid="folder-dropzone-${slug}"]`).click({ button: "right" });
    await page.locator(`[data-testid="rename-folder-${slug}"]`).click();

    const newName = `Redirected Folder ${timestamp}`;
    await page.locator(`[data-testid="rename-folder-input-${slug}"]`).fill(newName);
    await page.locator(`[data-testid="rename-folder-input-${slug}"]`).press("Enter");

    await page.waitForTimeout(1000);

    // URL should change to new slug
    const newSlug = newName.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "");
    await expect(page).toHaveURL(new RegExp(`/folders/${newSlug}`), { timeout: 10000 });
  });
});
