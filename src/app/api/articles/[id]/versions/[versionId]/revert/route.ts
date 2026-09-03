import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ArticleNotFoundError, updateArticle } from "@/lib/article-write";

// POST /api/articles/[id]/versions/[versionId]/revert - откатить статью к указанной версии
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;

  // Получаем версию для отката
  const targetVersion = await prisma.articleVersion.findFirst({
    where: { id: versionId, articleId: id },
  });

  if (!targetVersion) {
    return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
  }

  try {
    // Откат — обычная запись через единый сервис: версия REVERT, wiki-ссылки
    // и индекс AI-чата пересобираются (раньше откат их не трогал).
    const article = await updateArticle(
      id,
      {
        title: targetVersion.title,
        content: targetVersion.content,
        status: targetVersion.status,
      },
      {
        authorId: auth.userId!,
        changeType: "REVERT",
        changeSummary: `Откат к версии ${targetVersion.version}`,
      }
    );

    const version = await prisma.articleVersion.findFirst({
      where: { articleId: id },
      orderBy: { version: "desc" },
    });

    return NextResponse.json({ article, version });
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Revert error:", error);
    return NextResponse.json({ error: "Ошибка отката версии" }, { status: 500 });
  }
}
