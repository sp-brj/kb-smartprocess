import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/tags/[id] - получить тег по id или slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const tag = await prisma.tag.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      _count: { select: { articles: true } },
    },
  });

  if (!tag) {
    return NextResponse.json({ error: "Тег не найден" }, { status: 404 });
  }

  return NextResponse.json(tag);
}

// PATCH /api/tags/[id] - обновить тег
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
    const { name, color } = await request.json();

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (color !== undefined) data.color = color;

    const tag = await prisma.tag.update({
      where: { id },
      data,
      include: {
        _count: { select: { articles: true } },
      },
    });

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Update tag error:", error);
    return NextResponse.json({ error: "Ошибка обновления тега" }, { status: 500 });
  }
}

// DELETE /api/tags/[id] - удалить тег
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
    await prisma.tag.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete tag error:", error);
    return NextResponse.json({ error: "Ошибка удаления тега" }, { status: 500 });
  }
}
