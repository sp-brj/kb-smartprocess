import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { token } = await params;

  const shareLink = await prisma.folderShareLink.findUnique({
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

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
