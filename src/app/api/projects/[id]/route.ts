import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/projects/[id] - детали проекта
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: {
        select: { id: true, name: true, inn: true },
      },
      status: true,
      manager: { select: { id: true, name: true, email: true } },
      tasks: {
        include: {
          assignee: { select: { id: true, name: true, email: true } },
        },
        orderBy: [{ status: "asc" }, { order: "asc" }],
      },
      payments: {
        orderBy: { date: "desc" },
      },
      _count: { select: { tasks: true, timeEntries: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
  }

  // Подсчитать общее время по проекту
  const timeStats = await prisma.timeEntry.aggregate({
    where: { projectId: id },
    _sum: { duration: true },
  });

  // Подсчитать сумму оплат
  const paymentStats = await prisma.payment.aggregate({
    where: { projectId: id, status: "RECEIVED" },
    _sum: { amount: true },
  });

  return NextResponse.json({
    ...project,
    totalMinutes: timeStats._sum.duration || 0,
    totalPaid: paymentStats._sum.amount || 0,
  });
}

// PATCH /api/projects/[id] - обновить проект
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const data = await request.json();

    const existingProject = await prisma.project.findUnique({
      where: { id },
    });

    if (!existingProject) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.description !== undefined && {
          description: data.description?.trim() || null,
        }),
        ...(data.clientId !== undefined && { clientId: data.clientId }),
        ...(data.statusId !== undefined && { statusId: data.statusId }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.plannedStart !== undefined && {
          plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
        }),
        ...(data.plannedEnd !== undefined && {
          plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : null,
        }),
        ...(data.actualStart !== undefined && {
          actualStart: data.actualStart ? new Date(data.actualStart) : null,
        }),
        ...(data.actualEnd !== undefined && {
          actualEnd: data.actualEnd ? new Date(data.actualEnd) : null,
        }),
        ...(data.budget !== undefined && {
          budget: data.budget ? parseFloat(data.budget) : null,
        }),
        ...(data.managerId !== undefined && { managerId: data.managerId }),
      },
      include: {
        client: { select: { id: true, name: true } },
        status: true,
        manager: { select: { id: true, name: true, email: true } },
        _count: { select: { tasks: true } },
      },
    });

    return NextResponse.json(project);
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: "Ошибка обновления проекта" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - удалить проект
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        _count: { select: { tasks: true, timeEntries: true, payments: true } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    // Предупреждение если есть связанные данные
    const hasRelatedData =
      project._count.tasks > 0 ||
      project._count.timeEntries > 0 ||
      project._count.payments > 0;

    if (hasRelatedData) {
      return NextResponse.json(
        {
          error: `Невозможно удалить проект: есть связанные данные (${project._count.tasks} задач, ${project._count.timeEntries} записей времени, ${project._count.payments} оплат)`,
        },
        { status: 400 }
      );
    }

    await prisma.project.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Ошибка удаления проекта" },
      { status: 500 }
    );
  }
}
