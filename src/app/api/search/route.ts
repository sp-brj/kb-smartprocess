import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { makeSnippet } from "@/lib/snippet";

/**
 * GET /api/search?q=…&status=&folderId=&tag=&author=&limit=
 *
 * Поиск по заголовку и тексту (ILIKE). Фильтры нужны MCP-агенту: раньше
 * фильтр по тегу в search_articles был заглушкой.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return NextResponse.json({ articles: [] });
  }

  const status = searchParams.get("status");
  const folderId = searchParams.get("folderId");
  const tag = searchParams.get("tag");
  const author = searchParams.get("author");
  const rawLimit = Number(searchParams.get("limit"));
  const take = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 20;

  const where: Prisma.ArticleWhereInput = {
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { content: { contains: query, mode: "insensitive" } },
    ],
  };
  if (status === "DRAFT" || status === "PUBLISHED") where.status = status;
  if (folderId) where.folderId = folderId;
  if (tag) {
    where.tags = {
      some: {
        tag: { OR: [{ slug: tag }, { name: { equals: tag, mode: "insensitive" } }] },
      },
    };
  }
  if (author) where.author = { email: { equals: author, mode: "insensitive" } };

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { name: true, slug: true } },
      tags: { include: { tag: { select: { id: true, name: true, slug: true } } } },
    },
    orderBy: { updatedAt: "desc" },
    take,
  });

  const results = articles.map((article) => ({
    id: article.id,
    title: article.title,
    slug: article.slug,
    // Сниппет без HTML/Markdown-разметки (раньше в выдаче светились теги и **)
    snippet: makeSnippet(article.content, query),
    status: article.status,
    folder: article.folder,
    author: article.author,
    tags: article.tags.map((at) => at.tag),
    updatedAt: article.updatedAt,
  }));

  return NextResponse.json({ articles: results });
}
