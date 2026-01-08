import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/articles/[id]/versions/[versionId]/revert - откатить статью к указанной версии
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
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
    // Транзакция: создаем новую версию + обновляем статью
    const result = await prisma.$transaction(async (tx) => {
      // Получаем текущую статью
      const article = await tx.article.findUnique({
        where: { id },
      });

      if (!article) {
        throw new Error("Статья не найдена");
      }

      // Находим последнюю версию для номера
      const lastVersion = await tx.articleVersion.findFirst({
        where: { articleId: id },
        orderBy: { version: "desc" },
      });

      const newVersionNumber = (lastVersion?.version || 0) + 1;

      // Создаем новую версию (REVERT)
      const newVersion = await tx.articleVersion.create({
        data: {
          version: newVersionNumber,
          title: targetVersion.title,
          content: targetVersion.content,
          status: targetVersion.status,
          changeType: "REVERT",
          changeSummary: `Откат к версии ${targetVersion.version}`,
          articleId: id,
          authorId: session.user.id,
        },
      });

      // Обновляем саму статью
      const updatedArticle = await tx.article.update({
        where: { id },
        data: {
          title: targetVersion.title,
          content: targetVersion.content,
          status: targetVersion.status,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
          folder: { select: { id: true, name: true, slug: true } },
        },
      });

      return { article: updatedArticle, version: newVersion };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Revert error:", error);
    return NextResponse.json({ error: "Ошибка отката версии" }, { status: 500 });
  }
}
