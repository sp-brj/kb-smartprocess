import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// GET - получить статью по токену (публичный доступ)
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      article: {
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (!shareLink.isActive) {
    return NextResponse.json({ error: "Link is no longer active" }, { status: 410 });
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link has expired" }, { status: 410 });
  }

  return NextResponse.json(shareLink.article);
}

// DELETE - отозвать ссылку (требует авторизации)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Деактивируем ссылку вместо удаления (для истории)
  await prisma.shareLink.update({
    where: { token },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
