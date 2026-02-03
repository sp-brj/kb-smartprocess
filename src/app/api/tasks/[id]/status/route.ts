import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// PATCH /api/tasks/[id]/status - изменить статус задачи (для канбана)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { status, order } = body;

    if (!status) {
      return NextResponse.json({ error: "Статус обязателен" }, { status: 400 });
    }

    const validStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Неверный статус" }, { status: 400 });
    }

    // Если указан order, обновляем порядок
    const updated = await prisma.task.update({
      where: { id },
      data: {
        status,
        ...(order !== undefined && { order }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating task status:", error);
    return NextResponse.json({ error: "Ошибка обновления статуса" }, { status: 500 });
  }
}
