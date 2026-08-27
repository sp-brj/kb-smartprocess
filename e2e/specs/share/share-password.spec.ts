import { test, expect } from "../../fixtures/test";

/**
 * Регрессия на находки аудита: пароль на share-ссылке должен закрывать сам
 * контент (а не прятать его на клиенте), а отозванная ссылка — переставать
 * работать.
 */
test.describe("Sharing — пароль и отзыв", () => {
  test("запароленная ссылка не отдаёт контент до ввода пароля", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    context,
    timestamp,
  }) => {
    const secret = `Секретный текст ${timestamp}`;
    const title = `Protected Article ${timestamp}`;
    const password = `pw-${timestamp}`;

    await authenticatedPage.newArticleButton.click();
    await articleEditorPage.createArticle(title, secret);
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    await page.getByTestId("share-button").click();
    await expect(page.getByTestId("share-modal")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    await page.getByTestId("share-password").first().fill(password);
    await page.getByTestId("share-create").first().click();
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    const shareUrl = await page.getByTestId("share-link-url").first().inputValue();
    expect(shareUrl).toContain("/share/");
    const token = shareUrl.split("/share/")[1];

    // Аноним: страница показывает форму пароля и не содержит текста статьи
    const anon = await context.browser()!.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(shareUrl);
    await expect(anonPage.getByTestId("share-gate")).toBeVisible({ timeout: 10000 });
    await expect(anonPage.locator("body")).not.toContainText(secret);

    // API тоже не отдаёт контент без разблокировки
    const apiRes = await anonPage.request.get(`/api/share/${token}`);
    expect(apiRes.status()).toBe(401);

    // Неверный пароль — отказ
    await anonPage.getByTestId("share-gate-password").fill("wrong-password");
    await anonPage.getByTestId("share-gate-submit").click();
    await expect(anonPage.getByTestId("share-gate-error")).toBeVisible({ timeout: 10000 });

    // Верный пароль — контент виден
    await anonPage.getByTestId("share-gate-password").fill(password);
    await anonPage.getByTestId("share-gate-submit").click();
    await expect(anonPage.locator("h1")).toContainText(title, { timeout: 10000 });
    await expect(anonPage.locator("body")).toContainText(secret);

    await anon.close();
  });

  test("отозванная ссылка перестаёт открываться", async ({
    authenticatedPage,
    articleEditorPage,
    page,
    context,
    timestamp,
  }) => {
    const title = `Revoked Article ${timestamp}`;

    await authenticatedPage.newArticleButton.click();
    await articleEditorPage.createArticle(title, "Ссылку на эту статью отзовут.");
    await expect(page.locator("h1")).toContainText(title, { timeout: 10000 });

    await page.getByTestId("share-button").click();
    await expect(page.getByTestId("share-modal")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    await page.getByTestId("share-create").first().click();
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    const shareUrl = await page.getByTestId("share-link-url").first().inputValue();
    const token = shareUrl.split("/share/")[1];

    const anon = await context.browser()!.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(shareUrl);
    await expect(anonPage.locator("h1")).toContainText(title, { timeout: 10000 });

    // Отзываем
    await page.getByTestId("share-revoke").first().click();
    await expect(page.locator("text=Загрузка...")).toBeHidden({ timeout: 10000 });

    const afterRevoke = await anonPage.request.get(`/api/share/${token}`);
    expect(afterRevoke.status()).toBe(410);

    await anon.close();
  });
});
