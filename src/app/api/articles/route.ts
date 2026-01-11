import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSlug, extractWikilinks } from "@/lib/wikilinks";

/**
 * Создает связи ArticleLink для wiki-ссылок в контенте статьи
 */
async function createArticleLinks(articleId: string, content: string) {
  const wikilinks = extractWikilinks(content);
  if (wikilinks.length === 0) return;

  // Найти существующие статьи по заголовкам
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

  // Создать map для быстрого поиска
  const articleMap = new Map<string, string>();
  existingArticles.forEach((a) => {
    articleMap.set(a.title.toLowerCase(), a.id);
    articleMap.set(a.slug, a.id);
  });

  // Создать связи
  const linkData = wikilinks.map((link) => {
    const targetId =
      articleMap.get(link.title.toLowerCase()) ||
      articleMap.get(generateSlug(link.title)) ||
      null;

    return {
      sourceId: articleId,
      targetId,
      targetTitle: link.title,
    };
  });

  await prisma.articleLink.createMany({
    data: linkData,
    skipDuplicates: true,
  });
}

/**
 * Обновляет входящие ссылки когда создается новая статья
 * (связывает "битые" ссылки с новой статьей)
 */
async function linkOrphanedReferences(articleId: string, title: string) {
  const slug = generateSlug(title);

  await prisma.articleLink.updateMany({
    where: {
      targetId: null,
      OR: [
        { targetTitle: { equals: title, mode: "insensitive" } },
        { targetTitle: { equals: slug, mode: "insensitive" } },
      ],
    },
    data: { targetId: articleId },
  });
}

// GET /api/articles - list articles
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (folderId) where.folderId = folderId;
  if (status) where.status = status;

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      folder: { select: { id: true, name: true, slug: true } },
      tags: {
        include: { tag: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Преобразуем теги для удобства фронтенда
  const articlesWithTags = articles.map((article) => ({
    ...article,
    tags: article.tags.map((at) => at.tag),
  }));

  return NextResponse.json(articlesWithTags);
}

// POST /api/articles - create article
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
          authorId: session.user.id,
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
          authorId: session.user.id,
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

    return NextResponse.json(articleWithTags, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Ошибка создания статьи" }, { status: 500 });
  }
}
