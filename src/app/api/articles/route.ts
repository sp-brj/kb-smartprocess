import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

// GET /api/articles - list articles
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (folderId) where.folderId = folderId;
  if (status) where.status = status;

  const articles = await prisma.article.findMany({
    where,
    include: {
      author: { select: { id: true, name: true, email: true } },
      folder: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(articles);
}

// POST /api/articles - create article
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, content, folderId, status } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Заголовок обязателен" }, { status: 400 });
    }

    // Generate slug with Cyrillic transliteration
    const baseSlug = generateSlug(title);

    // Check uniqueness
    const existingArticle = await prisma.article.findUnique({ where: { slug: baseSlug } });
    const slug = existingArticle ? `${baseSlug}-${Date.now()}` : baseSlug;

    const article = await prisma.article.create({
      data: {
        title,
        content: content || "",
        slug,
        status: status || "DRAFT",
        folderId: folderId || null,
        authorId: session.user.id,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
        folder: { select: { id: true, name: true, slug: true } },
      },
    });

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    console.error("Create article error:", error);
    return NextResponse.json({ error: "Ошибка создания статьи" }, { status: 500 });
  }
}
