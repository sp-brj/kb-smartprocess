import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { diffLines } from "diff";

// GET /api/articles/[id]/versions/[versionId]/diff - получить diff между версиями
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;
  const { searchParams } = new URL(request.url);
  const compareWith = searchParams.get("compare");

  // Получаем версию
  const version = await prisma.articleVersion.findFirst({
    where: { id: versionId, articleId: id },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
  }

  // Определяем с чем сравнивать
  let compareVersion;
  if (compareWith) {
    compareVersion = await prisma.articleVersion.findFirst({
      where: { id: compareWith, articleId: id },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  } else {
    // По умолчанию сравниваем с предыдущей версией
    compareVersion = await prisma.articleVersion.findFirst({
      where: {
        articleId: id,
        version: version.version - 1,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  // Вычисляем diff
  const oldContent = compareVersion?.content || "";
  const newContent = version.content;

  const contentDiff = diffLines(oldContent, newContent);
  const titleChanged = compareVersion?.title !== version.title;

  return NextResponse.json({
    version,
    compareVersion,
    diff: {
      title: {
        changed: titleChanged,
        old: compareVersion?.title || null,
        new: version.title,
      },
      content: contentDiff,
    },
  });
}
