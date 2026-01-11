import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  // Параллельные запросы для оптимизации
  const [
    totalArticles,
    publishedArticles,
    draftArticles,
    totalFolders,
    totalTags,
    totalUsers,
    totalImages,
    totalShareLinks,
    totalViews,
    totalSearches,
    viewsToday,
    searchesToday,
  ] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { status: "PUBLISHED" } }),
    prisma.article.count({ where: { status: "DRAFT" } }),
    prisma.folder.count(),
    prisma.tag.count(),
    prisma.user.count(),
    prisma.image.count(),
    prisma.shareLink.count({ where: { isActive: true } }),
    prisma.articleView.count(),
    prisma.searchQuery.count(),
    prisma.articleView.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.searchQuery.count({
      where: { createdAt: { gte: todayStart } },
    }),
  ]);

  return NextResponse.json({
    content: {
      totalArticles,
      publishedArticles,
      draftArticles,
      totalFolders,
      totalTags,
      totalUsers,
      totalImages,
      totalShareLinks,
    },
    engagement: {
      totalViews,
      totalSearches,
      viewsToday,
      searchesToday,
    },
  });
}
