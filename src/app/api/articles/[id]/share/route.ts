import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - получить все ссылки для статьи
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shareLinks = await prisma.shareLink.findMany({
    where: { articleId: id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(shareLinks);
}

// POST - создать новую ссылку
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Проверяем что статья существует
  const article = await prisma.article.findUnique({
    where: { id },
  });

  if (!article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  // Получаем параметры из тела запроса (опционально)
  let expiresAt: Date | null = null;
  try {
    const body = await request.json();
    if (body.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
    }
  } catch {
    // Нет тела запроса - создаём бессрочную ссылку
  }

  const shareLink = await prisma.shareLink.create({
    data: {
      articleId: id,
      expiresAt,
    },
  });

  return NextResponse.json(shareLink, { status: 201 });
}
