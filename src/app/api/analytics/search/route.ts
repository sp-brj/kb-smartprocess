import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(parseInt(searchParams.get("days") || "30"), 90);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Популярные поисковые запросы
  const popularQueries = await prisma.searchQuery.groupBy({
    by: ["query"],
    where: { createdAt: { gte: startDate } },
    _count: { id: true },
    _avg: { resultsCount: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  // Запросы без результатов
  const failedQueries = await prisma.searchQuery.groupBy({
    by: ["query"],
    where: {
      createdAt: { gte: startDate },
      resultsCount: 0,
    },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  // CTR (Click-Through Rate)
  const [totalSearches, searchesWithClick] = await Promise.all([
    prisma.searchQuery.count({ where: { createdAt: { gte: startDate } } }),
    prisma.searchQuery.count({
      where: {
        createdAt: { gte: startDate },
        clickedArticleId: { not: null },
      },
    }),
  ]);

  const ctr =
    totalSearches > 0
      ? ((searchesWithClick / totalSearches) * 100).toFixed(1)
      : "0";

  return NextResponse.json({
    popularQueries: popularQueries.map((q) => ({
      query: q.query,
      count: q._count.id,
      avgResults: Math.round(q._avg.resultsCount || 0),
    })),
    failedQueries: failedQueries.map((q) => ({
      query: q.query,
      count: q._count.id,
    })),
    stats: {
      totalSearches,
      searchesWithClick,
      ctr: `${ctr}%`,
    },
  });
}
