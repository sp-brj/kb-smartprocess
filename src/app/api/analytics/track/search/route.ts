import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { query, resultsCount, sessionId, clickedArticleId } =
      await request.json();

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);

    await prisma.searchQuery.create({
      data: {
        query: query.toLowerCase().trim(),
        queryRaw: query.trim(),
        resultsCount: resultsCount ?? 0,
        userId: session?.user?.id || null,
        sessionId: session?.user?.id ? null : sessionId,
        clickedArticleId,
      },
    });

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error("Track search error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
