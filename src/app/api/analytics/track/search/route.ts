import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  // Публичный роут записи — лимит по IP, чтобы SearchQuery не заливали ботом.
  const rl = await rateLimit(`track:${clientIp(request.headers)}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

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
