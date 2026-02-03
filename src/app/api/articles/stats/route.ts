import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [total, withoutFolder] = await Promise.all([
    prisma.article.count(),
    prisma.article.count({ where: { folderId: null } })
  ]);

  return NextResponse.json({ total, withoutFolder });
}
