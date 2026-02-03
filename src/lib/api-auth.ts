import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";

export type Permission = "read" | "write" | "admin";

export type AuthResult = {
  authenticated: boolean;
  userId?: string;
  userRole?: string;
  permissions?: Permission[];
  authMethod: "session" | "apikey" | "none";
};

/**
 * Универсальная функция авторизации.
 * Проверяет сначала API Key (Bearer token), затем сессию NextAuth.
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  // 1. Попробовать API Key
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const keyPrefix = token.slice(0, 8);

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        keyPrefix,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { user: true },
    });

    if (apiKey && (await bcrypt.compare(token, apiKey.key))) {
      // Обновить lastUsedAt асинхронно (не блокируем ответ)
      prisma.apiKey
        .update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {
          // Игнорируем ошибки обновления lastUsedAt
        });

      return {
        authenticated: true,
        userId: apiKey.userId,
        userRole: apiKey.user.role,
        permissions: apiKey.permissions as Permission[],
        authMethod: "apikey",
      };
    }

    // Невалидный токен
    return { authenticated: false, authMethod: "none" };
  }

  // 2. Попробовать сессию NextAuth
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return {
      authenticated: true,
      userId: session.user.id,
      userRole: session.user.role,
      permissions: ["read", "write", "admin"], // Полный доступ для сессии
      authMethod: "session",
    };
  }

  return { authenticated: false, authMethod: "none" };
}

/**
 * Проверка наличия разрешения
 */
export function hasPermission(auth: AuthResult, required: Permission): boolean {
  if (!auth.authenticated) return false;
  if (auth.userRole === "ADMIN") return true;
  return auth.permissions?.includes(required) ?? false;
}

/**
 * Генерация нового API ключа
 * Возвращает { rawKey, hashedKey, keyPrefix }
 */
export async function generateApiKey(): Promise<{
  rawKey: string;
  hashedKey: string;
  keyPrefix: string;
}> {
  // Генерируем 32-байтовый ключ = 64 hex символа
  const rawKey = `kb_${crypto.randomBytes(32).toString("hex")}`;
  const keyPrefix = rawKey.slice(0, 8);
  const hashedKey = await bcrypt.hash(rawKey, 10);

  return { rawKey, hashedKey, keyPrefix };
}
