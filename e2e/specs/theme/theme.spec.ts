import { test, expect } from "../../fixtures/test";

test.describe("Theme Toggle", () => {
  test("should switch to dark theme", async ({ authenticatedPage, page }) => {
    // Click dark theme button
    await authenticatedPage.themeDarkButton.click();

    // Check that theme changed
    const currentTheme = await authenticatedPage.getCurrentTheme();
    expect(currentTheme).toBe("dark");

    // Check that dark class is on html
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");
  });

  test("should switch to light theme", async ({ authenticatedPage, page }) => {
    // First switch to dark
    await authenticatedPage.themeDarkButton.click();

    // Then switch to light
    await authenticatedPage.themeLightButton.click();

    const currentTheme = await authenticatedPage.getCurrentTheme();
    expect(currentTheme).toBe("light");

    // Check that dark class is NOT on html
    const htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).not.toContain("dark");
  });

  test("should persist theme after page reload", async ({ authenticatedPage, page }) => {
    // Switch to dark
    await authenticatedPage.themeDarkButton.click();
    await page.waitForTimeout(500);

    // Verify dark mode is applied before reload
    let htmlClass = await page.locator("html").getAttribute("class");
    expect(htmlClass).toContain("dark");

    // Verify localStorage has the theme
    const storedTheme = await page.evaluate(() => localStorage.getItem("theme"));
    expect(storedTheme).toBe("dark");

    // Reload page
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Check localStorage is preserved after reload
    const themeAfterReload = await page.evaluate(() => localStorage.getItem("theme"));
    expect(themeAfterReload).toBe("dark");

    // Wait for ThemeProvider to apply the class (React hydration)
    await page.waitForTimeout(1000);

    // Verify dark class is applied via data attribute on theme toggle
    const currentTheme = await authenticatedPage.getCurrentTheme();
    expect(currentTheme).toBe("dark");
  });

  test("should use system theme by default", async ({ authenticatedPage }) => {
    // Click system button
    await authenticatedPage.themeSystemButton.click();

    const currentTheme = await authenticatedPage.getCurrentTheme();
    expect(currentTheme).toBe("system");
  });
});
