import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/tasks - список задач с фильтрами
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const assigneeId = searchParams.get("assigneeId");
  const status = searchParams.get("status");
  const priority = searchParams.get("priority");
  const myTasks = searchParams.get("my") === "true";

  const where: Record<string, unknown> = {};

  if (projectId) where.projectId = projectId;
  if (assigneeId) where.assigneeId = assigneeId;
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (myTasks) where.assigneeId = auth.userId;

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true },
      },
      assignee: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: { checklist: true },
      },
    },
    orderBy: [
      { status: "asc" },
      { priority: "desc" },
      { deadline: "asc" },
    ],
  });

  // Добавляем количество выполненных пунктов чеклиста
  const tasksWithChecklist = await Promise.all(
    tasks.map(async (task) => {
      const completedItems = await prisma.checklistItem.count({
        where: { taskId: task.id, completed: true },
      });
      return {
        ...task,
        checklistCompleted: completedItems,
        checklistTotal: task._count.checklist,
      };
    })
  );

  return NextResponse.json(tasksWithChecklist);
}

// POST /api/tasks - создать задачу
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, description, projectId, assigneeId, priority, deadline, checklist } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: "Проект обязателен" }, { status: 400 });
    }

    // Проверяем существование проекта
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json({ error: "Проект не найден" }, { status: 404 });
    }

    // Определяем максимальный order для новой задачи
    const maxOrder = await prisma.task.aggregate({
      where: { projectId, status: "TODO" },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        projectId,
        assigneeId: assigneeId || null,
        priority: priority || "MEDIUM",
        deadline: deadline ? new Date(deadline) : null,
        status: "TODO",
        order: (maxOrder._max.order || 0) + 1,
        checklist: checklist?.length > 0 ? {
          create: checklist.map((item: string, index: number) => ({
            text: item,
            order: index,
          })),
        } : undefined,
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

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json({ error: "Ошибка создания задачи" }, { status: 500 });
  }
}
