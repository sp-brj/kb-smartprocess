import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  const [
    articlesWithoutTags,
    articlesWithoutFolder,
    orphanArticles,
    brokenLinks,
    staleArticles,
    allPublishedArticles,
  ] = await Promise.all([
    // Статьи без тегов
    prisma.article.findMany({
      where: { tags: { none: {} } },
      select: { id: true, title: true, slug: true, updatedAt: true },
      take: 20,
    }),

    // Статьи без папки
    prisma.article.findMany({
      where: { folderId: null },
      select: { id: true, title: true, slug: true, updatedAt: true },
      take: 20,
    }),

    // Сиротские статьи (без входящих ссылок)
    prisma.article.findMany({
      where: {
        incomingLinks: { none: {} },
        status: "PUBLISHED",
      },
      select: { id: true, title: true, slug: true, updatedAt: true },
      take: 20,
    }),

    // Битые wiki-ссылки (targetId = null)
    prisma.articleLink.findMany({
      where: { targetId: null },
      include: {
        source: { select: { id: true, title: true, slug: true } },
      },
      take: 50,
    }),

    // Устаревшие статьи (не обновлялись > 90 дней)
    prisma.article.findMany({
      where: { updatedAt: { lt: ninetyDaysAgo } },
      select: { id: true, title: true, slug: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: 20,
    }),

    // Все опубликованные статьи для проверки длины
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        updatedAt: true,
      },
    }),
  ]);

  // Фильтруем короткие статьи (< 200 символов)
  const shortArticles = allPublishedArticles
    .filter((a) => a.content.length < 200)
    .slice(0, 20)
    .map((a) => ({
      id: a.id,
      title: a.title,
      slug: a.slug,
      contentLength: a.content.length,
      updatedAt: a.updatedAt,
    }));

  return NextResponse.json({
    issues: {
      articlesWithoutTags: {
        count: articlesWithoutTags.length,
        items: articlesWithoutTags,
      },
      articlesWithoutFolder: {
        count: articlesWithoutFolder.length,
        items: articlesWithoutFolder,
      },
      orphanArticles: {
        count: orphanArticles.length,
        items: orphanArticles,
      },
      brokenLinks: {
        count: brokenLinks.length,
        items: brokenLinks.map((l) => ({
          targetTitle: l.targetTitle,
          source: l.source,
        })),
      },
      staleArticles: {
        count: staleArticles.length,
        items: staleArticles,
      },
      shortArticles: {
        count: shortArticles.length,
        items: shortArticles,
      },
    },
    summary: {
      totalIssues:
        articlesWithoutTags.length +
        articlesWithoutFolder.length +
        orphanArticles.length +
        brokenLinks.length +
        staleArticles.length +
        shortArticles.length,
    },
  });
}
