import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class ArticleEditorPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get titleInput() {
    return this.getByTestId("article-title-input");
  }

  get contentInput() {
    return this.getByTestId("article-content-input");
  }

  get submitButton() {
    return this.getByTestId("article-submit-btn");
  }

  get editorForm() {
    return this.getByTestId("article-editor-form");
  }

  async goto() {
    await super.goto("/articles/new");
  }

  async gotoEdit(slug: string) {
    await super.goto(`/articles/${slug}/edit`);
  }

  async fillArticle(title: string, content: string) {
    await this.titleInput.fill(title);
    await this.contentInput.fill(content);
  }

  async submit() {
    await this.submitButton.click();
    // Wait for navigation to article view page (not /new or /edit)
    await this.page.waitForURL(/\/articles\/[^/]+$/, { timeout: 15000 });
    // Wait for page to fully load - article view has h1 with text-3xl class
    await this.page.waitForSelector("h1.text-3xl", { timeout: 10000 });
  }

  async createArticle(title: string, content: string) {
    await this.fillArticle(title, content);
    await this.submit();
  }

  async expectOnEditorPage() {
    await expect(this.editorForm).toBeVisible();
  }
}
