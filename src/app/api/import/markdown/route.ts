import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import matter from "gray-matter";

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
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
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
        authorId: session.user.id,
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
