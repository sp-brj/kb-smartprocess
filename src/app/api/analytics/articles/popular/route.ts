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
  const period = searchParams.get("period") || "30d";
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  // Вычислить дату начала периода
  const now = new Date();
  let startDate: Date | undefined;
  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = undefined;
  }

  const whereClause = startDate ? { createdAt: { gte: startDate } } : {};

  // Группировка просмотров по статьям
  const viewCounts = await prisma.articleView.groupBy({
    by: ["articleId"],
    where: whereClause,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  // Получить информацию о статьях
  const articleIds = viewCounts.map((v) => v.articleId);
  const articles = await prisma.article.findMany({
    where: { id: { in: articleIds } },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      author: { select: { name: true } },
      folder: { select: { name: true } },
    },
  });

  const articleMap = new Map(articles.map((a) => [a.id, a]));

  const popular = viewCounts
    .map((v) => ({
      article: articleMap.get(v.articleId),
      views: v._count.id,
    }))
    .filter((p) => p.article);

  return NextResponse.json({ popular, period });
}
