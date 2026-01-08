import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[id]/backlinks - получить обратные ссылки на статью
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Находим статью по id или slug
  const article = await prisma.article.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    select: { id: true },
  });

  if (!article) {
    return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
  }

  // Получаем обратные ссылки
  const backlinks = await prisma.articleLink.findMany({
    where: { targetId: article.id },
    include: {
      source: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Преобразуем в удобный формат
  const result = backlinks.map((link) => ({
    id: link.id,
    article: link.source,
  }));

  return NextResponse.json(result);
}
