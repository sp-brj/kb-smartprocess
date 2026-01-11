import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { articleId, sessionId, duration } = await request.json();

    if (!articleId) {
      return NextResponse.json({ error: "articleId required" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    const headersList = await headers();

    // Хешируем IP для приватности
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0] || headersList.get("x-real-ip");
    const hashedIp = ip
      ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 16)
      : null;

    const userAgent = headersList.get("user-agent")?.slice(0, 500);
    const referrer = headersList.get("referer")?.slice(0, 500);

    // Дедупликация: не записывать повторные просмотры от того же пользователя за 30 минут
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const whereConditions = [];
    if (session?.user?.id) {
      whereConditions.push({ userId: session.user.id });
    }
    if (sessionId && !session?.user?.id) {
      whereConditions.push({ sessionId: sessionId, userId: null });
    }
    if (hashedIp && !session?.user?.id && !sessionId) {
      whereConditions.push({ ip: hashedIp, userId: null, sessionId: null });
    }

    if (whereConditions.length > 0) {
      const existingView = await prisma.articleView.findFirst({
        where: {
          articleId,
          createdAt: { gte: thirtyMinutesAgo },
          OR: whereConditions,
        },
      });

      if (existingView) {
        // Обновляем duration если передан
        if (duration && !existingView.duration) {
          await prisma.articleView.update({
            where: { id: existingView.id },
            data: { duration },
          });
        }
        return NextResponse.json({ tracked: false, reason: "duplicate" });
      }
    }

    await prisma.articleView.create({
      data: {
        articleId,
        userId: session?.user?.id || null,
        sessionId: session?.user?.id ? null : sessionId,
        ip: hashedIp,
        userAgent,
        referrer,
        duration,
      },
    });

    return NextResponse.json({ tracked: true });
  } catch (error) {
    console.error("Track view error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
