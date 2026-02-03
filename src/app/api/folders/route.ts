import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";

// GET /api/folders - list all folders
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders = await prisma.folder.findMany({
    include: {
      children: {
        include: {
          children: {
            include: {
              children: true,
              _count: { select: { articles: true } },
            },
          },
          _count: { select: { articles: true } },
        },
      },
      _count: { select: { articles: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(folders);
}

// POST /api/folders - create folder
export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, parentId } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Название обязательно" }, { status: 400 });
    }

    // Check folder depth (max 3 levels)
    if (parentId) {
      let depth = 1;
      let currentParentId: string | null = parentId;

      while (currentParentId && depth <= 3) {
        const parent = await prisma.folder.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        if (parent?.parentId) {
          depth++;
          currentParentId = parent.parentId;
        } else {
          break;
        }
      }

      if (depth >= 3) {
        return NextResponse.json(
          { error: "Максимальная глубина вложенности - 3 уровня" },
          { status: 400 }
        );
      }
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]+/gi, "-")
      .replace(/^-|-$/g, "");

    // Check if slug exists
    const existingFolder = await prisma.folder.findUnique({ where: { slug } });
    const finalSlug = existingFolder ? `${slug}-${Date.now()}` : slug;

    const folder = await prisma.folder.create({
      data: {
        name,
        slug: finalSlug,
        parentId: parentId || null,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Create folder error:", error);
    return NextResponse.json({ error: "Ошибка создания папки" }, { status: 500 });
  }
}
