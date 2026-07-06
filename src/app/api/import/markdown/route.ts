import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import matter from "gray-matter";
import { generateSlug } from "@/lib/wikilinks";

// Конвертация Obsidian wikilinks [[link]] -> markdown links
function convertWikilinks(content: string): string {
  // [[link|alias]] -> [alias](link)
  // [[link]] -> [link](link)
  return content.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, link, alias) => {
    const text = alias || link;
    const slug = generateSlug(link);
    return `[${text}](/articles/${slug})`;
  });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);

  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folderId = formData.get("folderId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const { data: frontmatter, content } = matter(text);

    // Получаем заголовок из frontmatter или имени файла
    let title = frontmatter.title as string | undefined;
    if (!title) {
      // Убираем расширение .md
      title = file.name.replace(/\.md$/, "");
    }

    // Генерируем slug
    const slug = generateSlug(title);

    // Проверяем уникальность slug
    let counter = 1;
    let finalSlug = slug;
    while (await prisma.article.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    // Конвертируем wikilinks
    const processedContent = convertWikilinks(content);

    // Создаём статью
    const article = await prisma.article.create({
      data: {
        title,
        content: processedContent,
        slug: finalSlug,
        status: frontmatter.status === "published" ? "PUBLISHED" : "DRAFT",
        folderId: folderId || null,
        authorId: auth.userId!,
      },
    });

    return NextResponse.json({
      success: true,
      article: {
        id: article.id,
        title: article.title,
        slug: article.slug,
      },
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      { error: "Failed to import file" },
      { status: 500 }
    );
  }
}
