import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "@/lib/rate-limit";

// Без UPSTASH_* переменных модуль работает на in-memory бэкенде — его и проверяем.
describe("rateLimit (in-memory)", () => {
  it("пропускает до лимита и блокирует дальше", async () => {
    const key = `test-${Math.random()}`;
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);
    expect((await rateLimit(key, 2, 60_000)).allowed).toBe(true);

    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("считает ключи независимо", async () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    await rateLimit(a, 1, 60_000);
    expect((await rateLimit(a, 1, 60_000)).allowed).toBe(false);
    expect((await rateLimit(b, 1, 60_000)).allowed).toBe(true);
  });

  it("окно истекает", async () => {
    const key = `w-${Math.random()}`;
    await rateLimit(key, 1, 5);
    await new Promise((r) => setTimeout(r, 20));
    expect((await rateLimit(key, 1, 5)).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  it("берёт первый адрес из x-forwarded-for", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(clientIp(headers)).toBe("1.2.3.4");
  });

  it("падает обратно на x-real-ip и unknown", () => {
    expect(clientIp(new Headers({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
