import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  shareUnlockCookieName,
  shareUnlockValue,
  shareUnlockCookieOptions,
} from "@/lib/share-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  // Анти-брутфорс пароля ссылки: лимит на пару token+IP.
  const rl = await rateLimit(
    `share-verify:${token}:${clientIp(request.headers)}`,
    10,
    5 * 60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many attempts" },
      { status: 429 }
    );
  }

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (!shareLink.password) {
    return NextResponse.json({ error: "No password set" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }

    const isValid = await bcrypt.compare(password, shareLink.password);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.set(
      shareUnlockCookieName("article", token),
      shareUnlockValue(token, shareLink.password),
      shareUnlockCookieOptions()
    );
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
