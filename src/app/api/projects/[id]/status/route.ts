import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/projects/[id]/status - изменить статус проекта (для воронки)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { statusId } = await request.json();

    if (!statusId) {
      return NextResponse.json(
        { error: "Статус обязателен" },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    const status = await prisma.projectStatus.findUnique({
      where: { id: statusId },
    });

    if (!status) {
      return NextResponse.json({ error: "Статус не найден" }, { status: 404 });
    }

    // Обновить статус и при необходимости actualStart/actualEnd
    const updateData: Record<string, unknown> = { statusId };

    // Если переходим в статус "В работе" и нет actualStart - установить
    if (status.type === "WORK" && !project.actualStart) {
      updateData.actualStart = new Date();
    }

    // Если переходим в статус "Завершён" и нет actualEnd - установить
    if (status.type === "DONE" && !project.actualEnd) {
      updateData.actualEnd = new Date();
    }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true } },
        status: true,
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json(updatedProject);
  } catch (error) {
    console.error("Update project status error:", error);
    return NextResponse.json(
      { error: "Ошибка изменения статуса" },
      { status: 500 }
    );
  }
}
