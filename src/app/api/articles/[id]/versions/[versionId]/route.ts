import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[id]/versions/[versionId] - получить конкретную версию
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, versionId } = await params;

  const version = await prisma.articleVersion.findFirst({
    where: {
      id: versionId,
      articleId: id,
    },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
  });

  if (!version) {
    return NextResponse.json({ error: "Версия не найдена" }, { status: 404 });
  }

  return NextResponse.json(version);
}
