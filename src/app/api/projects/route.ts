import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

// GET /api/projects - список проектов с фильтрами
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const statusId = searchParams.get("statusId");
  const managerId = searchParams.get("managerId");
  const type = searchParams.get("type");
  const search = searchParams.get("search");

  const projects = await prisma.project.findMany({
    where: {
      ...(clientId && { clientId }),
      ...(statusId && { statusId }),
      ...(managerId && { managerId }),
      ...(type && { type: type as "IMPLEMENTATION" | "CONSULTING" | "DEVELOPMENT" | "SUPPORT" }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { client: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
    },
    include: {
      client: { select: { id: true, name: true } },
      status: true,
      manager: { select: { id: true, name: true, email: true } },
      _count: { select: { tasks: true } },
    },
    orderBy: [{ status: { order: "asc" } }, { createdAt: "desc" }],
  });

  return NextResponse.json(projects);
}

// POST /api/projects - создание проекта
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();

    if (!data.name?.trim()) {
      return NextResponse.json(
        { error: "Название проекта обязательно" },
        { status: 400 }
      );
    }

    if (!data.clientId) {
      return NextResponse.json(
        { error: "Клиент обязателен" },
        { status: 400 }
      );
    }

    if (!data.type) {
      return NextResponse.json(
        { error: "Тип проекта обязателен" },
        { status: 400 }
      );
    }

    // Получить статус по умолчанию или указанный
    let statusId = data.statusId;
    if (!statusId) {
      const defaultStatus = await prisma.projectStatus.findFirst({
        where: { isDefault: true },
      });
      if (!defaultStatus) {
        return NextResponse.json(
          { error: "Не найден статус по умолчанию" },
          { status: 500 }
        );
      }
      statusId = defaultStatus.id;
    }

    const project = await prisma.project.create({
      data: {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        clientId: data.clientId,
        statusId,
        type: data.type,
        plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
        plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : null,
        budget: data.budget ? parseFloat(data.budget) : null,
        managerId: data.managerId || auth.userId!,
      },
      include: {
        client: { select: { id: true, name: true } },
        status: true,
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Ошибка создания проекта" },
      { status: 500 }
    );
  }
}
