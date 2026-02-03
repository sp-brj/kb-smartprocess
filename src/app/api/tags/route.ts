import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/wikilinks";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

// GET /api/tags - список всех тегов с количеством статей
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    include: {
      _count: { select: { articles: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

// POST /api/tags - создание нового тега
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, color } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Название тега обязательно" }, { status: 400 });
    }

    const slug = generateSlug(name.trim());

    // Проверяем уникальность
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: name.trim(), mode: "insensitive" } },
          { slug },
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Тег с таким названием уже существует" }, { status: 400 });
    }

    const tag = await prisma.tag.create({
      data: {
        name: name.trim(),
        slug,
        color: color || null,
      },
      include: {
        _count: { select: { articles: true } },
      },
    });

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Create tag error:", error);
    return NextResponse.json({ error: "Ошибка создания тега" }, { status: 500 });
  }
}
