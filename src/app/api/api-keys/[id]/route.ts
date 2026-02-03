import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Permission } from "@/lib/api-auth";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/api-keys/:id - информация о ключе
export async function GET(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
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
  });

  if (!apiKey) {
    return NextResponse.json({ error: "API ключ не найден" }, { status: 404 });
  }

  return NextResponse.json(apiKey);
}

// PATCH /api/api-keys/:id - обновить ключ
export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Проверяем, что ключ принадлежит пользователю
  const existingKey = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingKey) {
    return NextResponse.json({ error: "API ключ не найден" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { name, permissions, isActive } = body;

    const updateData: {
      name?: string;
      permissions?: Permission[];
      isActive?: boolean;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Название не может быть пустым" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }

    if (permissions !== undefined) {
      const validPermissions: Permission[] = ["read", "write", "admin"];
      updateData.permissions = permissions.filter((p: string) =>
        validPermissions.includes(p as Permission)
      );
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: updateData,
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
    });

    return NextResponse.json(apiKey);
  } catch (error) {
    console.error("Update API key error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления API ключа" },
      { status: 500 }
    );
  }
}

// DELETE /api/api-keys/:id - удалить ключ
export async function DELETE(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Проверяем, что ключ принадлежит пользователю
  const existingKey = await prisma.apiKey.findFirst({
    where: { id, userId: session.user.id },
  });

  if (!existingKey) {
    return NextResponse.json({ error: "API ключ не найден" }, { status: 404 });
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
