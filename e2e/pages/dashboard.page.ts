import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Header elements
  get newArticleButton() {
    return this.getByTestId("new-article-btn");
  }

  get adminLink() {
    return this.getByTestId("admin-link");
  }

  get userEmail() {
    return this.getByTestId("user-email");
  }

  get logoutButton() {
    return this.getByTestId("logout-btn");
  }

  get searchInput() {
    return this.getByTestId("search-input");
  }

  get searchResults() {
    return this.getByTestId("search-results");
  }

  get searchNoResults() {
    return this.getByTestId("search-no-results");
  }

  // Sidebar elements
  get createFolderButton() {
    return this.getByTestId("create-folder-btn");
  }

  get folderNameInput() {
    return this.getByTestId("folder-name-input");
  }

  get createFolderForm() {
    return this.getByTestId("create-folder-form");
  }

  get allArticlesLink() {
    return this.getByTestId("all-articles-link");
  }

  get allArticlesDropzone() {
    return this.getByTestId("all-articles-dropzone");
  }

  get articlesList() {
    return this.getByTestId("articles-list");
  }

  // Theme elements
  get themeToggle() {
    return this.getByTestId("theme-toggle");
  }

  get themeLightButton() {
    return this.getByTestId("theme-light-btn");
  }

  get themeDarkButton() {
    return this.getByTestId("theme-dark-btn");
  }

  get themeSystemButton() {
    return this.getByTestId("theme-system-btn");
  }

  // Methods for folders
  folderLink(slug: string) {
    return this.getByTestId(`folder-link-${slug}`);
  }

  folderDropzone(slug: string) {
    return this.getByTestId(`folder-dropzone-${slug}`);
  }

  folderToggle(slug: string) {
    return this.getByTestId(`folder-toggle-${slug}`);
  }

  addSubfolderButton(slug: string) {
    return this.getByTestId(`add-subfolder-${slug}`);
  }

  subfolderForm(slug: string) {
    return this.getByTestId(`subfolder-form-${slug}`);
  }

  subfolderNameInput(slug: string) {
    return this.getByTestId(`subfolder-name-input-${slug}`);
  }

  // Methods for articles
  articleItem(slug: string) {
    return this.getByTestId(`article-item-${slug}`);
  }

  articleLink(slug: string) {
    return this.getByTestId(`article-link-${slug}`);
  }

  searchResult(slug: string) {
    return this.getByTestId(`search-result-${slug}`);
  }

  // Navigation
  async goto() {
    await super.goto("/");
  }

  async gotoArticles() {
    await super.goto("/articles");
  }

  // Actions
  async createFolder(name: string) {
    await this.createFolderButton.click();
    await this.folderNameInput.fill(name);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(500);
  }

  async createSubfolder(parentSlug: string, name: string) {
    await this.addSubfolderButton(parentSlug).click();
    await this.subfolderNameInput(parentSlug).fill(name);
    await this.page.keyboard.press("Enter");
    await this.page.waitForTimeout(500);
  }

  async expandFolder(slug: string) {
    await this.folderToggle(slug).click();
  }

  async search(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async logout() {
    await this.logoutButton.click();
  }

  async setTheme(theme: "light" | "dark" | "system") {
    if (theme === "light") {
      await this.themeLightButton.click();
    } else if (theme === "dark") {
      await this.themeDarkButton.click();
    } else {
      await this.themeSystemButton.click();
    }
  }

  async getCurrentTheme() {
    return await this.themeToggle.getAttribute("data-current-theme");
  }

  // Drag and Drop
  async dragArticleToFolder(articleSlug: string, folderSlug: string) {
    const article = this.articleItem(articleSlug);
    const folder = this.folderDropzone(folderSlug);
    await article.dragTo(folder);
    await this.page.waitForTimeout(500);
  }

  async dragArticleToAllArticles(articleSlug: string) {
    const article = this.articleItem(articleSlug);
    await article.dragTo(this.allArticlesDropzone);
    await this.page.waitForTimeout(500);
  }

  // Assertions
  async expectLoggedIn(email: string) {
    await expect(this.userEmail).toContainText(email);
  }

  async expectFolderExists(slug: string) {
    await expect(this.folderLink(slug)).toBeVisible();
  }

  async expectArticleInList(slug: string) {
    await expect(this.articleItem(slug)).toBeVisible();
  }

  async expectSearchResultsVisible() {
    await expect(this.searchResults).toBeVisible();
  }

  async expectNoSearchResults() {
    await expect(this.searchNoResults).toBeVisible();
  }

  async expectAdminLinkVisible() {
    await expect(this.adminLink).toBeVisible();
  }

  async expectAdminLinkHidden() {
    await expect(this.adminLink).not.toBeVisible();
  }
}
