import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Try to find by ID or slug
  const article = await prisma.article.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
      folder: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
  }

  return NextResponse.json(article);
}

// PATCH /api/articles/[id]
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
    const body = await request.json();
    const { title, content, folderId, status } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title;
    if (content !== undefined) data.content = content;
    if (folderId !== undefined) data.folderId = folderId || null;
    if (status !== undefined) data.status = status;

    const article = await prisma.article.update({
      where: { id },
      data,
      include: {
        author: { select: { id: true, name: true, email: true } },
        folder: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(article);
  } catch (error) {
    console.error("Update article error:", error);
    return NextResponse.json({ error: "Ошибка обновления статьи" }, { status: 500 });
  }
}

// DELETE /api/articles/[id]
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
    await prisma.article.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete article error:", error);
    return NextResponse.json({ error: "Ошибка удаления статьи" }, { status: 500 });
  }
}
