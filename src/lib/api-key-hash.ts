import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * Хеширование API-ключей.
 *
 * Ключ — 256 бит случайности (`kb_` + 64 hex), перебор невозможен, поэтому
 * bcrypt здесь избыточен: он стоил ~50–100 мс на КАЖДЫЙ запрос с ключом
 * (у MCP-агента — на каждый tool-call). Новые ключи хранятся как SHA-256,
 * сравнение мгновенное и в константное время.
 *
 * Старые ключи (bcrypt, начинаются с `$2`) продолжают работать: проверка
 * выбирает алгоритм по формату сохранённого хеша, перевыпускать их не нужно.
 */

export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
}

export function isLegacyBcryptHash(stored: string): boolean {
  return stored.startsWith("$2");
}

export async function verifyApiKey(rawKey: string, stored: string): Promise<boolean> {
  if (isLegacyBcryptHash(stored)) {
    return bcrypt.compare(rawKey, stored);
  }
  const actual = Buffer.from(hashApiKey(rawKey));
  const expected = Buffer.from(stored);
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
