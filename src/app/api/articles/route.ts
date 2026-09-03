import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { parseListRange } from "@/lib/pagination";
import { createArticle, type ArticleStatus } from "@/lib/article-write";

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
  // Фильтры для MCP/внешних клиентов: раньше MCP фильтровал по тегу и автору
  // на своей стороне поверх первой страницы (100 статей) и молча терял остальное.
  const tag = searchParams.get("tag"); // slug или имя тега
  const author = searchParams.get("author"); // email автора

  // Пагинация: раньше список тянул ВСЕ статьи целиком вместе с полным content.
  // Теперь — окно (по умолчанию 100, максимум 500) и без тела статьи;
  // content отдаёт GET /api/articles/[id].
  const { take, skip } = parseListRange(searchParams);

  const where: Prisma.ArticleWhereInput = {};
  if (noFolder === "true") {
    where.folderId = null;
  } else if (folderId) {
    where.folderId = folderId;
  }
  if (status === "DRAFT" || status === "PUBLISHED") where.status = status;
  if (tag) {
    where.tags = {
      some: {
        tag: { OR: [{ slug: tag }, { name: { equals: tag, mode: "insensitive" } }] },
      },
    };
  }
  if (author) where.author = { email: { equals: author, mode: "insensitive" } };

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

    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
    }

    const article = await createArticle({
      title: title.trim(),
      content: typeof content === "string" ? content : "",
      folderId: typeof folderId === "string" ? folderId : null,
      status: status === "PUBLISHED" ? "PUBLISHED" : ("DRAFT" satisfies ArticleStatus),
      authorId: auth.userId!,
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Ошибка создания статьи" }, { status: 500 });
  }
}
