import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/time-entries - список записей времени
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const taskId = searchParams.get("taskId");
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const my = searchParams.get("my") === "true";

  const where: Record<string, unknown> = {};

  if (projectId) where.projectId = projectId;
  if (taskId) where.taskId = taskId;
  if (userId) where.userId = userId;
  if (my) where.userId = auth.userId;

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) (where.date as Record<string, Date>).lte = new Date(to);
  }

  const entries = await prisma.timeEntry.findMany({
    where,
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
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(entries);
}

// POST /api/time-entries - создать запись времени
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { projectId, taskId, date, duration, workType, description, billable } = body;

    if (!projectId) {
      return NextResponse.json({ error: "Проект обязателен" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Дата обязательна" }, { status: 400 });
    }

    if (!duration || duration <= 0) {
      return NextResponse.json({ error: "Длительность обязательна" }, { status: 400 });
    }

    // Проверяем существование проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    // Если указана задача, проверяем что она принадлежит проекту
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, projectId },
      });
      if (!task) {
        return NextResponse.json({ error: "Задача не найдена в проекте" }, { status: 404 });
      }
    }

    const entry = await prisma.timeEntry.create({
      data: {
        projectId,
        taskId: taskId || null,
        userId: auth.userId!,
        date: new Date(date),
        duration: parseInt(duration),
        workType: workType || "OTHER",
        description: description?.trim() || null,
        billable: billable !== false,
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

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating time entry:", error);
    return NextResponse.json({ error: "Ошибка создания записи" }, { status: 500 });
  }
}
