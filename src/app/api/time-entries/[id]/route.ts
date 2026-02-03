import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/time-entries/[id] - детали записи
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.timeEntry.findUnique({
    where: { id },
    include: {
      project: {
        select: { id: true, name: true, client: { select: { name: true } } },
      },
      task: {
        select: { id: true, title: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  return NextResponse.json(entry);
}

// PATCH /api/time-entries/[id] - обновить запись
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  // Можно редактировать только свои записи (или админ)
  if (entry.userId !== auth.userId && auth.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Нет прав на редактирование" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { date, duration, workType, description, billable, taskId } = body;

    const updated = await prisma.timeEntry.update({
      where: { id },
      data: {
        ...(date !== undefined && { date: new Date(date) }),
        ...(duration !== undefined && { duration: parseInt(duration) }),
        ...(workType !== undefined && { workType }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(billable !== undefined && { billable }),
        ...(taskId !== undefined && { taskId: taskId || null }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        task: {
          select: { id: true, title: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating time entry:", error);
    return NextResponse.json({ error: "Ошибка обновления записи" }, { status: 500 });
  }
}

// DELETE /api/time-entries/[id] - удалить запись
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) {
    return NextResponse.json({ error: "Запись не найдена" }, { status: 404 });
  }

  // Можно удалять только свои записи (или админ)
  if (entry.userId !== auth.userId && auth.userRole !== "ADMIN") {
    return NextResponse.json({ error: "Нет прав на удаление" }, { status: 403 });
  }

  await prisma.timeEntry.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
