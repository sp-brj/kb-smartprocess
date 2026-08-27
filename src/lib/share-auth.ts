import crypto from "crypto";

/**
 * Серверная проверка «пароль от share-ссылки введён верно».
 *
 * Раньше проверка пароля жила только на клиенте: контент рендерился сервером
 * всегда, а PasswordProtectedContent лишь визуально его прятал. Любой с токеном
 * читал контент напрямую через API или из initial payload страницы.
 *
 * Теперь /verify при верном пароле ставит подписанную HttpOnly-cookie, а API и
 * server-страницы отдают контент только при валидной cookie.
 *
 * Значение cookie = HMAC(secret, "<token>:<passwordHash>"). Оно:
 *  - непредсказуемо без NEXTAUTH_SECRET (нельзя подделать, зная только токен);
 *  - привязано к текущему хешу пароля (сменили пароль ссылки → старые cookie мертвы);
 *  - не содержит самого пароля.
 */

export type ShareKind = "article" | "folder";

function secret(): string {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) {
    // Без секрета подпись небезопасна — это конфигурационная ошибка окружения.
    throw new Error("NEXTAUTH_SECRET is not set");
  }
  return s;
}

/** Имя cookie для конкретной ссылки. Разные ссылки разблокируются независимо. */
export function shareUnlockCookieName(kind: ShareKind, token: string): string {
  return `sl_${kind === "article" ? "a" : "f"}_${token}`;
}

/** Значение unlock-cookie для ссылки с данным хешем пароля. */
export function shareUnlockValue(token: string, passwordHash: string): string {
  return crypto
    .createHmac("sha256", secret())
    .update(`${token}:${passwordHash}`)
    .digest("hex");
}

/** Проверка предъявленной cookie в константное время. */
export function isShareUnlocked(
  cookieValue: string | undefined,
  token: string,
  passwordHash: string
): boolean {
  if (!cookieValue) return false;
  const expected = shareUnlockValue(token, passwordHash);
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Опции cookie: HttpOnly, на весь сайт, живёт 8 часов. */
export function shareUnlockCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 8,
  };
}

/**
 * Кто вправе отозвать share-ссылку.
 *
 * Раньше любой залогиненный деактивировал любую ссылку. Теперь — только её
 * создатель или ADMIN. Legacy-ссылки без владельца (`createdById === null`,
 * остались у ссылок на папки до миграции 20260819120000) отзывает только ADMIN.
 */
export function canRevokeShareLink(
  auth: { userId?: string; userRole?: string },
  link: { createdById: string | null }
): boolean {
  if (auth.userRole === "ADMIN") return true;
  return !!link.createdById && link.createdById === auth.userId;
}
