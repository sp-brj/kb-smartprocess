import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import {
  canRevokeShareLink,
  isShareUnlocked,
  shareUnlockCookieName,
} from "@/lib/share-auth";

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

  // Запароленная ссылка: контент только при валидной unlock-cookie (её ставит
  // POST /verify). Без неё — 401, даже если токен известен.
  if (shareLink.password) {
    const unlocked = isShareUnlocked(
      request.cookies.get(shareUnlockCookieName("article", token))?.value,
      token,
      shareLink.password
    );
    if (!unlocked) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 401 }
      );
    }
  }

  return NextResponse.json(shareLink.article);
}

// DELETE - отозвать ссылку (требует авторизации)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Отозвать ссылку может только её создатель или ADMIN
  if (!canRevokeShareLink(auth, shareLink)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Деактивируем ссылку вместо удаления (для истории)
  await prisma.shareLink.update({
    where: { token },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
