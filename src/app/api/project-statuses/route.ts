import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/project-statuses - список всех статусов проектов
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses = await prisma.projectStatus.findMany({
    include: {
      _count: { select: { projects: true } },
    },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(statuses);
}

// POST /api/project-statuses - создание нового статуса (только ADMIN)
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || auth.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { name, color, type, isDefault } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Название статуса обязательно" },
        { status: 400 }
      );
    }

    if (!color) {
      return NextResponse.json(
        { error: "Цвет статуса обязателен" },
        { status: 400 }
      );
    }

    if (!type) {
      return NextResponse.json(
        { error: "Тип статуса обязателен" },
        { status: 400 }
      );
    }

    // Получить максимальный order для добавления в конец
    const maxOrder = await prisma.projectStatus.aggregate({
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? 0) + 1;

    // Если новый статус isDefault, сбросить isDefault у других
    if (isDefault) {
      await prisma.projectStatus.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const status = await prisma.projectStatus.create({
      data: {
        name: name.trim(),
        color,
        order: newOrder,
        type,
        isDefault: isDefault ?? false,
      },
      include: {
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json(status, { status: 201 });
  } catch (error) {
    console.error("Create project status error:", error);
    return NextResponse.json(
      { error: "Ошибка создания статуса" },
      { status: 500 }
    );
  }
}
