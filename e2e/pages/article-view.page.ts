import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ArticleViewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get articleTitle() {
    return this.page.locator("h1");
  }

  get editButton() {
    return this.page.locator('a:has-text("Редактировать")');
  }

  get deleteButton() {
    return this.page.locator('button:has-text("Удалить")');
  }

  get shareButton() {
    return this.page.locator('button:has-text("Поделиться")');
  }

  get copyLinkButton() {
    return this.page.locator('button:has-text("Копировать ссылку")');
  }

  async goto(slug: string) {
    await super.goto(`/articles/${slug}`);
  }

  async edit() {
    await this.editButton.click();
    await this.page.waitForURL(/\/edit$/);
  }

  async delete() {
    await this.deleteButton.click();
    await this.page.waitForTimeout(500);
  }

  async share() {
    await this.shareButton.click();
    await this.page.waitForTimeout(500);
  }

  async copyShareLink() {
    await this.copyLinkButton.click();
  }

  async expectTitle(title: string) {
    await expect(this.articleTitle).toContainText(title);
  }

  async expectOnArticlePage() {
    await expect(this.articleTitle).toBeVisible();
  }
}
