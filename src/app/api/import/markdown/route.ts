import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import matter from "gray-matter";
import { createArticle } from "@/lib/article-write";

/**
 * POST /api/import/markdown — импорт .md (например, из Obsidian).
 *
 * Wiki-ссылки [[…]] сохраняются как есть: KB поддерживает их нативно
 * (автодополнение, обратные ссылки). Раньше импорт превращал их в обычные
 * markdown-ссылки, и backlinks для импортированных статей терялись.
 * Версия v1 и индекс AI-чата создаются так же, как при создании через UI.
 */
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

    // Заголовок из frontmatter или имени файла (без .md)
    const title =
      (typeof frontmatter.title === "string" && frontmatter.title.trim()) ||
      file.name.replace(/\.md$/i, "");

    const article = await createArticle({
      title,
      content,
      folderId: folderId || null,
      status: frontmatter.status === "published" ? "PUBLISHED" : "DRAFT",
      authorId: auth.userId!,
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
