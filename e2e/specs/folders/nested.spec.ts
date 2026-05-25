import { test, expect } from "../../fixtures/test";

test.describe("Folders - Nested Structure", () => {
  test("should create nested folders", async ({
    authenticatedPage,
    page,
    timestamp
  }) => {
    // Create level 1 folder with unique name
    const level1Name = `Parent ${timestamp}`;
    await authenticatedPage.createFolder(level1Name);
    await expect(page.locator(`text=${level1Name}`)).toBeVisible({ timeout: 10000 });

    // Wait for folder to appear
    await page.waitForTimeout(500);

    // Get the folder slug
    const level1Slug = level1Name.toLowerCase().replace(/\s+/g, "-");

    // Hover over the folder to reveal add subfolder button
    const folderItem = page.locator(`[data-testid="folder-item-${level1Slug}"]`);
    await folderItem.hover();
    await page.waitForTimeout(200);

    // Click add subfolder button
    const addSubfolderBtn = page.locator(`[data-testid="add-subfolder-${level1Slug}"]`);
    await expect(addSubfolderBtn).toBeVisible({ timeout: 5000 });
    await addSubfolderBtn.click();

    // Fill in the child folder name
    const childName = `Child ${timestamp}`;
    const childInput = page.locator(`[data-testid="subfolder-name-input-${level1Slug}"]`);
    await childInput.fill(childName);
    await page.keyboard.press("Enter");

    // Wait for the subfolder to be created and page to update
    await page.waitForTimeout(1000);

    // After creating subfolder, the page refreshes/updates the sidebar
    // Reload the page to ensure we have fresh data
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Expand parent folder to see children - look for toggle button
    const toggleBtn = page.locator(`[data-testid="folder-toggle-${level1Slug}"]`);
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });
    await toggleBtn.click();
    await page.waitForTimeout(500);

    // Verify child folder is visible
    await expect(page.locator(`text=${childName}`)).toBeVisible({ timeout: 10000 });
  });

  test("should expand and collapse folders", async ({
    authenticatedPage,
    page,
    timestamp
  }) => {
    // Create parent folder
    const parentName = `Expand Test ${timestamp}`;
    await authenticatedPage.createFolder(parentName);
    await page.waitForTimeout(500);

    const parentSlug = parentName.toLowerCase().replace(/\s+/g, "-");

    // Hover and click add subfolder
    const folderItem = page.locator(`[data-testid="folder-item-${parentSlug}"]`);
    await folderItem.hover();
    await page.waitForTimeout(200);

    const addSubfolderBtn = page.locator(`[data-testid="add-subfolder-${parentSlug}"]`);
    await expect(addSubfolderBtn).toBeVisible({ timeout: 5000 });
    await addSubfolderBtn.click();

    // Create child folder
    const childName = `Collapse Child ${timestamp}`;
    const childInput = page.locator(`[data-testid="subfolder-name-input-${parentSlug}"]`);
    await childInput.fill(childName);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Reload to get fresh data
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Toggle should now be visible for parent
    const toggleBtn = page.locator(`[data-testid="folder-toggle-${parentSlug}"]`);
    await expect(toggleBtn).toBeVisible({ timeout: 10000 });

    // Expand - child should be visible
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await expect(page.locator(`text=${childName}`)).toBeVisible({ timeout: 5000 });

    // Collapse - child should be hidden
    await toggleBtn.click();
    await page.waitForTimeout(500);
    // After collapse, child should not be visible
    await expect(page.locator(`text=${childName}`)).not.toBeVisible({ timeout: 3000 });
  });

  test("should limit nesting depth to 3 levels", async ({
    authenticatedPage,
    page,
    timestamp
  }) => {
    // Create level 1 folder
    const level1 = `Depth1 ${timestamp}`;
    await authenticatedPage.createFolder(level1);
    await page.waitForTimeout(500);

    const slug1 = level1.toLowerCase().replace(/\s+/g, "-");

    // Add level 2 subfolder
    const folderItem1 = page.locator(`[data-testid="folder-item-${slug1}"]`);
    await folderItem1.hover();
    await page.waitForTimeout(200);

    const addBtn1 = page.locator(`[data-testid="add-subfolder-${slug1}"]`);
    await expect(addBtn1).toBeVisible({ timeout: 5000 });
    await addBtn1.click();

    const level2 = `Depth2 ${timestamp}`;
    await page.locator(`[data-testid="subfolder-name-input-${slug1}"]`).fill(level2);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Reload and expand level 1
    await page.reload();
    await page.waitForLoadState("networkidle");

    const toggle1 = page.locator(`[data-testid="folder-toggle-${slug1}"]`);
    await expect(toggle1).toBeVisible({ timeout: 10000 });
    await toggle1.click();
    await page.waitForTimeout(500);

    const slug2 = level2.toLowerCase().replace(/\s+/g, "-");

    // Verify level 2 folder is visible
    await expect(page.locator(`[data-testid="folder-link-${slug2}"]`)).toBeVisible({ timeout: 5000 });

    // Add level 3 subfolder
    const folderItem2 = page.locator(`[data-testid="folder-item-${slug2}"]`);
    await folderItem2.hover();
    await page.waitForTimeout(200);

    const addBtn2 = page.locator(`[data-testid="add-subfolder-${slug2}"]`);
    await expect(addBtn2).toBeVisible({ timeout: 5000 });
    await addBtn2.click();

    const level3 = `Depth3 ${timestamp}`;
    await page.locator(`[data-testid="subfolder-name-input-${slug2}"]`).fill(level3);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(1000);

    // Reload and expand both levels
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Re-expand level 1
    await page.locator(`[data-testid="folder-toggle-${slug1}"]`).click();
    await page.waitForTimeout(500);

    // Expand level 2
    const toggle2 = page.locator(`[data-testid="folder-toggle-${slug2}"]`);
    await expect(toggle2).toBeVisible({ timeout: 5000 });
    await toggle2.click();
    await page.waitForTimeout(500);

    // Verify level 3 folder exists
    const slug3 = level3.toLowerCase().replace(/\s+/g, "-");
    await expect(page.locator(`[data-testid="folder-link-${slug3}"]`)).toBeVisible({ timeout: 5000 });

    // Level 3 folder should NOT have add subfolder button (max depth)
    const folderItem3 = page.locator(`[data-testid="folder-item-${slug3}"]`);
    await folderItem3.hover();
    await page.waitForTimeout(200);

    // The add-subfolder button should not exist for level 3 folders
    const addBtn3 = page.locator(`[data-testid="add-subfolder-${slug3}"]`);
    await expect(addBtn3).not.toBeVisible({ timeout: 2000 });
  });
});
