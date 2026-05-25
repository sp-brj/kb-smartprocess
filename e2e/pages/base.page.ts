import { Page, Locator } from "@playwright/test";

export class BasePage {
  constructor(public readonly page: Page) {}

  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  async goto(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
  }
}
