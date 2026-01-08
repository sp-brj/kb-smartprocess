import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/suggestions?q=... - автодополнение для wiki-ссылок
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";

  if (!query) {
    return NextResponse.json([]);
  }

  const articles = await prisma.article.findMany({
    where: {
      title: { contains: query, mode: "insensitive" },
    },
    select: {
      id: true,
      title: true,
      slug: true,
    },
    take: 10,
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(articles);
}
