import { Page, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class LoginPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get emailInput() {
    return this.getByTestId("login-email");
  }

  get passwordInput() {
    return this.getByTestId("login-password");
  }

  get submitButton() {
    return this.getByTestId("login-submit");
  }

  get errorMessage() {
    return this.getByTestId("login-error");
  }

  get loginForm() {
    return this.getByTestId("login-form");
  }

  async goto() {
    await super.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectError(errorText: string) {
    await expect(this.errorMessage).toContainText(errorText);
  }

  async expectOnLoginPage() {
    await expect(this.loginForm).toBeVisible();
  }
}
