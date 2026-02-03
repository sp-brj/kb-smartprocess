import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateApiKey, Permission } from "@/lib/api-auth";

// GET /api/api-keys - список ключей текущего пользователя
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKeys = await prisma.apiKey.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      permissions: true,
      lastUsedAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apiKeys);
}

// POST /api/api-keys - создать новый ключ
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, permissions, expiresAt } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Название ключа обязательно" },
        { status: 400 }
      );
    }

    // Валидация permissions
    const validPermissions: Permission[] = ["read", "write", "admin"];
    const keyPermissions: Permission[] = permissions
      ? permissions.filter((p: string) => validPermissions.includes(p as Permission))
      : ["read"];

    // Генерируем ключ
    const { rawKey, hashedKey, keyPrefix } = await generateApiKey();

    // Создаем запись
    const apiKey = await prisma.apiKey.create({
      data: {
        name: name.trim(),
        key: hashedKey,
        keyPrefix,
        userId: session.user.id,
        permissions: keyPermissions,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Возвращаем ключ только при создании!
    return NextResponse.json(
      {
        ...apiKey,
        key: rawKey, // Показываем только один раз
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create API key error:", error);
    return NextResponse.json(
      { error: "Ошибка создания API ключа" },
      { status: 500 }
    );
  }
}
