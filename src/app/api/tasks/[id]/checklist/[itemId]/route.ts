import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// PATCH /api/tasks/[id]/checklist/[itemId] - обновить пункт чеклиста
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, taskId: id },
  });

  if (!item) {
    return NextResponse.json({ error: "Пункт не найден" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const { text, completed, order } = body;

    const updated = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        ...(text !== undefined && { text: text.trim() }),
        ...(completed !== undefined && { completed }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating checklist item:", error);
    return NextResponse.json({ error: "Ошибка обновления пункта" }, { status: 500 });
  }
}

// DELETE /api/tasks/[id]/checklist/[itemId] - удалить пункт чеклиста
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, itemId } = await params;

  const item = await prisma.checklistItem.findFirst({
    where: { id: itemId, taskId: id },
  });

  if (!item) {
    return NextResponse.json({ error: "Пункт не найден" }, { status: 404 });
  }

  await prisma.checklistItem.delete({ where: { id: itemId } });

  return NextResponse.json({ success: true });
}
