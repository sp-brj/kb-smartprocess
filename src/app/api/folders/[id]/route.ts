import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/folders/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const folder = await prisma.folder.findUnique({
    where: { id },
    include: {
      children: true,
      articles: { orderBy: { updatedAt: "desc" } },
    },
  });

  if (!folder) {
    return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
  }

  return NextResponse.json(folder);
}

// PATCH /api/folders/[id] - rename folder
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { name } = await request.json();

    const folder = await prisma.folder.update({
      where: { id },
      data: { name },
    });

    return NextResponse.json(folder);
  } catch (error) {
    console.error("Update folder error:", error);
    return NextResponse.json({ error: "Ошибка обновления папки" }, { status: 500 });
  }
}

// DELETE /api/folders/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Check if folder has articles
    const folder = await prisma.folder.findUnique({
      where: { id },
      include: { _count: { select: { articles: true, children: true } } },
    });

    if (!folder) {
      return NextResponse.json({ error: "Папка не найдена" }, { status: 404 });
    }

    if (folder._count.articles > 0 || folder._count.children > 0) {
      return NextResponse.json(
        { error: "Нельзя удалить папку с содержимым" },
        { status: 400 }
      );
    }

    await prisma.folder.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete folder error:", error);
    return NextResponse.json({ error: "Ошибка удаления папки" }, { status: 500 });
  }
}
