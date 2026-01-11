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
  startDate.setHours(0, 0, 0, 0);

  // Активность по дням (созданные и обновлённые статьи)
  const versions = await prisma.articleVersion.findMany({
    where: { createdAt: { gte: startDate } },
    select: { createdAt: true, changeType: true },
  });

  // Группировка по дням
  const activityByDay = new Map<
    string,
    { created: number; updated: number; reverted: number }
  >();

  for (let d = 0; d <= days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    const key = date.toISOString().split("T")[0];
    activityByDay.set(key, { created: 0, updated: 0, reverted: 0 });
  }

  versions.forEach((v) => {
    const key = v.createdAt.toISOString().split("T")[0];
    const day = activityByDay.get(key);
    if (day) {
      if (v.changeType === "CREATE") day.created++;
      else if (v.changeType === "UPDATE") day.updated++;
      else if (v.changeType === "REVERT") day.reverted++;
    }
  });

  const timeline = Array.from(activityByDay.entries()).map(([date, data]) => ({
    date,
    ...data,
    total: data.created + data.updated + data.reverted,
  }));

  // Топ авторов за период
  const topAuthors = await prisma.articleVersion.groupBy({
    by: ["authorId"],
    where: { createdAt: { gte: startDate } },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const authorIds = topAuthors.map((a) => a.authorId);
  const authors = await prisma.user.findMany({
    where: { id: { in: authorIds } },
    select: { id: true, name: true, email: true },
  });

  const authorMap = new Map(authors.map((a) => [a.id, a]));
  const authorsWithCounts = topAuthors.map((a) => ({
    author: authorMap.get(a.authorId),
    edits: a._count.id,
  }));

  // Последние изменения
  const recentChanges = await prisma.articleVersion.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      article: { select: { title: true, slug: true } },
      author: { select: { name: true, email: true } },
    },
  });

  return NextResponse.json({
    timeline,
    topAuthors: authorsWithCounts,
    recentChanges: recentChanges.map((v) => ({
      article: v.article,
      author: v.author,
      changeType: v.changeType,
      changeSummary: v.changeSummary,
      createdAt: v.createdAt,
    })),
  });
}
