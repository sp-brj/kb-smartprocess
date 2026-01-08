import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AdminUsersPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get usersTable() {
    return this.page.locator("table");
  }

  get userRows() {
    return this.page.locator("tbody tr");
  }

  async goto() {
    await super.goto("/admin/users");
  }

  async expectOnAdminPage() {
    await expect(this.usersTable).toBeVisible();
  }

  async expectUserInList(email: string) {
    await expect(this.page.locator(`text=${email}`)).toBeVisible();
  }

  async getUserCount() {
    return await this.userRows.count();
  }
}
