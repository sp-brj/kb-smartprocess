import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - получить все ссылки для папки
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || !hasPermission(auth, "read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const shareLinks = await prisma.folderShareLink.findMany({
    where: { folderId: id },
    orderBy: { createdAt: "desc" },
  });

  // Не возвращаем хэш пароля
  const linksWithoutPassword = shareLinks.map(link => ({
    ...link,
    password: undefined,
    hasPassword: !!link.password,
  }));

  return NextResponse.json(linksWithoutPassword);
}

// POST - создать новую ссылку
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Проверяем что папка существует
  const folder = await prisma.folder.findUnique({
    where: { id },
  });

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Получаем параметры из тела запроса (опционально)
  let expiresAt: Date | null = null;
  let password: string | null = null;
  try {
    const body = await request.json();
    if (body.expiresInDays) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + body.expiresInDays);
    }
    if (body.password) {
      password = await bcrypt.hash(body.password, 10);
    }
  } catch {
    // Нет тела запроса - создаём бессрочную ссылку без пароля
  }

  const shareLink = await prisma.folderShareLink.create({
    data: {
      folderId: id,
      expiresAt,
      password,
      createdById: auth.userId,
    },
  });

  // Не возвращаем хэш пароля
  return NextResponse.json({
    ...shareLink,
    password: undefined,
    hasPassword: !!password,
  }, { status: 201 });
}
