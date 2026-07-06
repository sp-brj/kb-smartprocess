import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, withoutFolder] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { folderId: null } })
  ]);

  return NextResponse.json({ total, withoutFolder });
}
