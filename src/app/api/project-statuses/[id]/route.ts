import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/project-statuses/[id] - получить статус по ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const status = await prisma.projectStatus.findUnique({
    where: { id },
    include: {
      _count: { select: { projects: true } },
    },
  });

  if (!status) {
    return NextResponse.json({ error: "Статус не найден" }, { status: 404 });
  }

  return NextResponse.json(status);
}

// PATCH /api/project-statuses/[id] - обновить статус (только ADMIN)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || auth.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { name, color, order, isDefault } = await request.json();

    const existingStatus = await prisma.projectStatus.findUnique({
      where: { id },
    });

    if (!existingStatus) {
      return NextResponse.json({ error: "Статус не найден" }, { status: 404 });
    }

    // Если меняем isDefault на true, сбросить у других
    if (isDefault && !existingStatus.isDefault) {
      await prisma.projectStatus.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const status = await prisma.projectStatus.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(color !== undefined && { color }),
        ...(order !== undefined && { order }),
        ...(isDefault !== undefined && { isDefault }),
      },
      include: {
        _count: { select: { projects: true } },
      },
    });

    return NextResponse.json(status);
  } catch (error) {
    console.error("Update project status error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления статуса" },
      { status: 500 }
    );
  }
}

// DELETE /api/project-statuses/[id] - удалить статус (только ADMIN)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || auth.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const status = await prisma.projectStatus.findUnique({
      where: { id },
      include: {
        _count: { select: { projects: true } },
      },
    });

    if (!status) {
      return NextResponse.json({ error: "Статус не найден" }, { status: 404 });
    }

    // Нельзя удалить статус с привязанными проектами
    if (status._count.projects > 0) {
      return NextResponse.json(
        {
          error: `Невозможно удалить статус: ${status._count.projects} проектов используют этот статус`,
        },
        { status: 400 }
      );
    }

    await prisma.projectStatus.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project status error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления статуса" },
      { status: 500 }
    );
  }
}
