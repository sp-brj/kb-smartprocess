import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

// GET /api/articles/[id]/versions - список всех версий статьи
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const versions = await prisma.articleVersion.findMany({
    where: { articleId: id },
    include: {
      author: { select: { id: true, name: true, email: true } },
    },
    orderBy: { version: "desc" },
  });

  return NextResponse.json(versions);
}
