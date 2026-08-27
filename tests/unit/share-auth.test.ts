import { beforeAll, describe, expect, it } from "vitest";

process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "unit-test-secret";

let mod: typeof import("@/lib/share-auth");

beforeAll(async () => {
  mod = await import("@/lib/share-auth");
});

describe("share unlock cookie", () => {
  it("имя cookie различается для статьи и папки", () => {
    expect(mod.shareUnlockCookieName("article", "tok")).not.toBe(
      mod.shareUnlockCookieName("folder", "tok")
    );
  });

  it("значение детерминировано и не содержит хеш пароля", () => {
    const v1 = mod.shareUnlockValue("tok", "$2a$10$hash");
    const v2 = mod.shareUnlockValue("tok", "$2a$10$hash");
    expect(v1).toBe(v2);
    expect(v1).not.toContain("$2a$10$hash");
  });

  it("подпись привязана к токену", () => {
    expect(mod.shareUnlockValue("tok-1", "h")).not.toBe(
      mod.shareUnlockValue("tok-2", "h")
    );
  });

  it("валидная cookie открывает ссылку", () => {
    const value = mod.shareUnlockValue("tok", "hash");
    expect(mod.isShareUnlocked(value, "tok", "hash")).toBe(true);
  });

  it("смена пароля инвалидирует старую cookie", () => {
    const value = mod.shareUnlockValue("tok", "old-hash");
    expect(mod.isShareUnlocked(value, "tok", "new-hash")).toBe(false);
  });

  it("подделка и пустая cookie не проходят", () => {
    expect(mod.isShareUnlocked("подделка", "tok", "hash")).toBe(false);
    expect(mod.isShareUnlocked(undefined, "tok", "hash")).toBe(false);
  });
});

describe("canRevokeShareLink", () => {
  const link = { createdById: "user-1" };

  it("создатель может", () => {
    expect(mod.canRevokeShareLink({ userId: "user-1", userRole: "EDITOR" }, link)).toBe(true);
  });

  it("посторонний не может", () => {
    expect(mod.canRevokeShareLink({ userId: "user-2", userRole: "EDITOR" }, link)).toBe(false);
  });

  it("ADMIN может всегда", () => {
    expect(mod.canRevokeShareLink({ userId: "user-2", userRole: "ADMIN" }, link)).toBe(true);
  });

  it("legacy-ссылку без владельца отзывает только ADMIN", () => {
    const legacy = { createdById: null };
    expect(mod.canRevokeShareLink({ userId: "user-1", userRole: "EDITOR" }, legacy)).toBe(false);
    expect(mod.canRevokeShareLink({ userId: "user-1", userRole: "ADMIN" }, legacy)).toBe(true);
  });
});
