import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[id]/tags - получить теги статьи
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const articleTags = await prisma.articleTag.findMany({
    where: { articleId: id },
    include: { tag: true },
  });

  const tags = articleTags.map((at) => at.tag);
  return NextResponse.json(tags);
}

// PUT /api/articles/[id]/tags - установить теги статьи (замена всех)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { tagIds } = await request.json();

    // Удаляем старые связи
    await prisma.articleTag.deleteMany({ where: { articleId: id } });

    // Создаем новые
    if (tagIds?.length > 0) {
      await prisma.articleTag.createMany({
        data: tagIds.map((tagId: string) => ({
          articleId: id,
          tagId,
        })),
        skipDuplicates: true,
      });
    }

    // Возвращаем обновленные теги
    const updatedTags = await prisma.articleTag.findMany({
      where: { articleId: id },
      include: { tag: true },
    });

    return NextResponse.json(updatedTags.map((at) => at.tag));
  } catch (error) {
    console.error("Update article tags error:", error);
    return NextResponse.json({ error: "Ошибка обновления тегов" }, { status: 500 });
  }
}

// POST /api/articles/[id]/tags - добавить тег к статье
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { tagId } = await request.json();

    if (!tagId) {
      return NextResponse.json({ error: "tagId обязателен" }, { status: 400 });
    }

    const articleTag = await prisma.articleTag.create({
      data: {
        articleId: id,
        tagId,
      },
      include: { tag: true },
    });

    return NextResponse.json(articleTag.tag, { status: 201 });
  } catch (error) {
    console.error("Add tag to article error:", error);
    return NextResponse.json({ error: "Ошибка добавления тега" }, { status: 500 });
  }
}
