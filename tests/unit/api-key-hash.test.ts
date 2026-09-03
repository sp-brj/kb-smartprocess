import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { hashApiKey, isLegacyBcryptHash, verifyApiKey } from "@/lib/api-key-hash";

const RAW = "kb_" + "ab".repeat(32);

describe("api-key-hash", () => {
  it("новые ключи — sha256 hex, детерминированный", () => {
    const h = hashApiKey(RAW);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey(RAW)).toBe(h);
    expect(isLegacyBcryptHash(h)).toBe(false);
  });

  it("проверяет sha256-ключ и отвергает чужой", async () => {
    const stored = hashApiKey(RAW);
    expect(await verifyApiKey(RAW, stored)).toBe(true);
    expect(await verifyApiKey(RAW.slice(0, -1) + "0", stored)).toBe(false);
    expect(await verifyApiKey(RAW, "deadbeef")).toBe(false);
  });

  it("старые bcrypt-ключи продолжают работать", async () => {
    const legacy = await bcrypt.hash(RAW, 4);
    expect(isLegacyBcryptHash(legacy)).toBe(true);
    expect(await verifyApiKey(RAW, legacy)).toBe(true);
    expect(await verifyApiKey(RAW + "x", legacy)).toBe(false);
  });
});
