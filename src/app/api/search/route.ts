import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ articles: [] });
  }

  // Поиск по заголовку и контенту
  const articles = await prisma.article.findMany({
    where: {
      OR: [
        { title: { contains: query.trim(), mode: "insensitive" } },
        { content: { contains: query.trim(), mode: "insensitive" } },
      ],
    },
    include: {
      author: { select: { name: true, email: true } },
      folder: { select: { name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  // Добавляем сниппет контекста для каждой статьи
  const results = articles.map((article) => {
    let snippet = "";
    const lowerContent = article.content.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const pos = lowerContent.indexOf(lowerQuery);

    if (pos !== -1) {
      const start = Math.max(0, pos - 50);
      const end = Math.min(article.content.length, pos + query.length + 100);
      snippet = (start > 0 ? "..." : "") +
                article.content.slice(start, end) +
                (end < article.content.length ? "..." : "");
    } else {
      // Если не нашли в контенте, берём начало статьи
      snippet = article.content.slice(0, 150) + (article.content.length > 150 ? "..." : "");
    }

    return {
      id: article.id,
      title: article.title,
      slug: article.slug,
      snippet,
      status: article.status,
      folder: article.folder,
      author: article.author,
      updatedAt: article.updatedAt,
    };
  });

  return NextResponse.json({ articles: results });
}
