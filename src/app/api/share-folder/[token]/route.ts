import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";
import { canRevokeShareLink } from "@/lib/share-auth";

interface RouteParams {
  params: Promise<{ token: string }>;
}

// DELETE - отозвать ссылку
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;

  const shareLink = await prisma.folderShareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  // Отозвать ссылку может только её создатель или ADMIN
  if (!canRevokeShareLink(auth, shareLink)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.folderShareLink.update({
    where: { token },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
