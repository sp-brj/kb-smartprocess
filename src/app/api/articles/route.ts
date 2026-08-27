import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/wikilinks";
import { createArticleLinks, linkOrphanedReferences } from "@/lib/wikilinks-db";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { reindexArticle } from "@/lib/reindex";
import { parseListRange } from "@/lib/pagination";

// GET /api/articles - list articles
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");
  const noFolder = searchParams.get("noFolder");

  // Пагинация: раньше список тянул ВСЕ статьи целиком вместе с полным content.
  // Теперь — окно (по умолчанию 100, максимум 500) и без тела статьи;
  // content отдаёт GET /api/articles/[id].
  const { take, skip } = parseListRange(searchParams);

  const where: Record<string, unknown> = {};
  if (noFolder === "true") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }
  if (status) where.status = status;

  const [total, articles] = await Promise.all([
    prisma.article.count({ where }),
    prisma.article.findMany({
      where,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        publishedAt: true,
        folderId: true,
        authorId: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, name: true, email: true } },
        folder: { select: { id: true, name: true, slug: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { updatedAt: "desc" },
      take,
      skip,
    }),
  ]);

  // Преобразуем теги для удобства фронтенда
  const articlesWithTags = articles.map((article) => ({
    ...article,
    tags: article.tags.map((at) => at.tag),
  }));

  // Тело ответа остаётся массивом (совместимость с MCP и внешними клиентами),
  // счётчики — в заголовках.
  return NextResponse.json(articlesWithTags, {
    headers: {
      "X-Total-Count": String(total),
      "X-Limit": String(take),
      "X-Offset": String(skip),
    },
  });
}

// POST /api/articles - create article
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, folderId, status } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
    }

    // Generate slug with Cyrillic transliteration
    const baseSlug = generateSlug(title);

    // Check uniqueness
    const existingArticle = await prisma.article.findUnique({ where: { slug: baseSlug } });
    const slug = existingArticle ? `${baseSlug}-${Date.now()}` : baseSlug;

    const articleContent = content || "";
    const articleStatus = status || "DRAFT";

    // Транзакция: создаем статью + первую версию
    const article = await prisma.$transaction(async (tx) => {
      const newArticle = await tx.article.create({
        data: {
          title,
          content: articleContent,
          slug,
          status: articleStatus,
          publishedAt: articleStatus === "PUBLISHED" ? new Date() : null,
          folderId: folderId || null,
          authorId: auth.userId!,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
          folder: { select: { id: true, name: true, slug: true } },
          tags: { include: { tag: true } },
        },
      });

      // Создаем первую версию
      await tx.articleVersion.create({
        data: {
          version: 1,
          title: newArticle.title,
          content: newArticle.content,
          status: newArticle.status,
          changeType: "CREATE",
          articleId: newArticle.id,
          authorId: auth.userId!,
        },
      });

      return newArticle;
    });

    // Создаем wiki-ссылки (после транзакции)
    if (articleContent) {
      await createArticleLinks(article.id, articleContent);
    }

    // Связываем "битые" ссылки из других статей
    await linkOrphanedReferences(article.id, title);

    // Преобразуем теги
    const articleWithTags = {
      ...article,
      tags: article.tags.map((at) => at.tag),
    };

    // Fire-and-forget reindex (don't await, don't block response)
    reindexArticle(article.id).catch((err) =>
      console.error("Reindex error:", err)
    );

    return NextResponse.json(articleWithTags, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Ошибка создания статьи" }, { status: 500 });
  }
}
