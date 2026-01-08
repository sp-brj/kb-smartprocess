import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractWikilinks, generateSlug } from "@/lib/wikilinks";

/**
 * Обновляет связи ArticleLink при изменении контента
 */
async function updateArticleLinks(articleId: string, content: string) {
  // Удаляем старые ссылки
  await prisma.articleLink.deleteMany({ where: { sourceId: articleId } });

  const wikilinks = extractWikilinks(content);
  if (wikilinks.length === 0) return;

  // Найти существующие статьи
  const titles = wikilinks.map((l) => l.title);
  const existingArticles = await prisma.article.findMany({
    where: {
      OR: [
        { title: { in: titles, mode: "insensitive" } },
        { slug: { in: titles.map((t) => generateSlug(t)) } },
      ],
    },
    select: { id: true, title: true, slug: true },
  });

  const articleMap = new Map<string, string>();
  existingArticles.forEach((a) => {
    articleMap.set(a.title.toLowerCase(), a.id);
    articleMap.set(a.slug, a.id);
  });

  const linkData = wikilinks.map((link) => ({
    sourceId: articleId,
    targetId:
      articleMap.get(link.title.toLowerCase()) ||
      articleMap.get(generateSlug(link.title)) ||
      null,
    targetTitle: link.title,
  }));

  await prisma.articleLink.createMany({
    data: linkData,
    skipDuplicates: true,
  });
}

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
      tags: { include: { tag: true } },
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
  }

  // Преобразуем теги
  const articleWithTags = {
    ...article,
    tags: article.tags.map((at) => at.tag),
  };

  return NextResponse.json(articleWithTags);
}

// PATCH /api/articles/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content, folderId, status } = body;

    // Транзакция: обновляем статью + создаем версию
    const article = await prisma.$transaction(async (tx) => {
      // Получаем текущую статью
      const currentArticle = await tx.article.findUnique({
        where: { id },
      });

      if (!currentArticle) {
        throw new Error("Статья не найдена");
      }

      // Проверяем, есть ли реальные изменения в контенте/заголовке/статусе
      const hasVersionableChanges =
        (title !== undefined && title !== currentArticle.title) ||
        (content !== undefined && content !== currentArticle.content) ||
        (status !== undefined && status !== currentArticle.status);

      // Создаем новую версию только если есть изменения
      if (hasVersionableChanges) {
        const lastVersion = await tx.articleVersion.findFirst({
          where: { articleId: id },
          orderBy: { version: "desc" },
        });

        await tx.articleVersion.create({
          data: {
            version: (lastVersion?.version || 0) + 1,
            title: title ?? currentArticle.title,
            content: content ?? currentArticle.content,
            status: status ?? currentArticle.status,
            changeType: "UPDATE",
            articleId: id,
            authorId: session.user.id,
          },
        });
      }

      // Обновляем статью
      const data: Record<string, unknown> = {};
      if (title !== undefined) data.title = title;
      if (content !== undefined) data.content = content;
      if (folderId !== undefined) data.folderId = folderId || null;
      if (status !== undefined) data.status = status;

      const updatedArticle = await tx.article.update({
        where: { id },
        data,
        include: {
          author: { select: { id: true, name: true, email: true } },
          folder: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
        },
      });

      return updatedArticle;
    });

    // Обновляем wiki-ссылки если изменился контент
    if (content !== undefined) {
      await updateArticleLinks(id, content);
    }

    // Преобразуем теги
    const articleWithTags = {
      ...article,
      tags: article.tags.map((at) => at.tag),
    };

    return NextResponse.json(articleWithTags);
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
