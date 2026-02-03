import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/tasks/[id] - детали задачи
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          client: { select: { id: true, name: true } },
        },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      checklist: {
        orderBy: { order: "asc" },
      },
      timeEntries: {
        select: {
          id: true,
          duration: true,
          date: true,
          description: true,
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  // Подсчитываем общее время по задаче
  const totalMinutes = await prisma.timeEntry.aggregate({
    where: { taskId: id },
    _sum: { duration: true },
  });

  return NextResponse.json({
    ...task,
    totalMinutes: totalMinutes._sum.duration || 0,
  });
}

// PATCH /api/tasks/[id] - обновить задачу
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
    const { title, description, assigneeId, priority, deadline, status } = body;

    const updated = await prisma.task.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(assigneeId !== undefined && { assigneeId: assigneeId || null }),
        ...(priority !== undefined && { priority }),
        ...(deadline !== undefined && { deadline: deadline ? new Date(deadline) : null }),
        ...(status !== undefined && { status }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { id: true, name: true, email: true },
        },
        checklist: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Ошибка обновления задачи" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id] - удалить задачу
export async function DELETE(
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

  // Проверяем есть ли таймлоги
  const timeEntriesCount = await prisma.timeEntry.count({
    where: { taskId: id },
  });

  if (timeEntriesCount > 0) {
    return NextResponse.json(
      { error: "Нельзя удалить задачу с записями времени" },
      { status: 400 }
    );
  }

  // Удаляем чеклист и задачу
  await prisma.$transaction([
    prisma.checklistItem.deleteMany({ where: { taskId: id } }),
    prisma.task.delete({ where: { id } }),
  ]);

  return NextResponse.json({ success: true });
}
