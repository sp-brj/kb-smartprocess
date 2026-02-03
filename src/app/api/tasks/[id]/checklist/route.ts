import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/tasks/[id]/checklist - получить чеклист задачи
export async function GET(
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

  const items = await prisma.checklistItem.findMany({
    where: { taskId: id },
    orderBy: { order: "asc" },
  });

  return NextResponse.json(items);
}

// POST /api/tasks/[id]/checklist - добавить пункт чеклиста
export async function POST(
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
    const { text } = body;

    if (!text?.trim()) {
      return NextResponse.json({ error: "Текст обязателен" }, { status: 400 });
    }

    // Получаем максимальный order
    const maxOrder = await prisma.checklistItem.aggregate({
      where: { taskId: id },
      _max: { order: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        taskId: id,
        text: text.trim(),
        order: (maxOrder._max.order || 0) + 1,
        completed: false,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating checklist item:", error);
    return NextResponse.json({ error: "Ошибка добавления пункта" }, { status: 500 });
  }
}
