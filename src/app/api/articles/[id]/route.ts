import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest, hasPermission } from "@/lib/api-auth";
import { deleteArticleChunks } from "@/lib/reindex";
import {
  ARTICLE_INCLUDE,
  ArticleNotFoundError,
  updateArticle,
  withFlatTags,
  type UpdateArticlePatch,
} from "@/lib/article-write";

// GET /api/articles/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Try to find by ID or slug
  const article = await prisma.article.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: ARTICLE_INCLUDE,
  });

  if (!article) {
    return NextResponse.json({ error: "Статья не найдена" }, { status: 404 });
  }

  return NextResponse.json(withFlatTags(article));
}

// PATCH /api/articles/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { title, content, folderId, status, minor } = body;

    const patch: UpdateArticlePatch = {};
    if (typeof title === "string") patch.title = title;
    if (typeof content === "string") patch.content = content;
    if (folderId !== undefined) patch.folderId = folderId || null;
    if (status === "DRAFT" || status === "PUBLISHED") patch.status = status;

    const article = await updateArticle(id, patch, {
      authorId: auth.userId!,
      // minor: true — мелкая правка (чекбокс в тексте): без версии и reindex
      minor: minor === true,
    });

    return NextResponse.json(article);
  } catch (error) {
    if (error instanceof ArticleNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error("Update article error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Ошибка обновления статьи", detail },
      { status: 500 }
    );
  }
}

// DELETE /api/articles/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated || !hasPermission(auth, "write")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.article.delete({ where: { id } });

    // Chunks are cascade-deleted by FK, but clean up explicitly too
    deleteArticleChunks(id).catch((err) =>
      console.error("Delete chunks error:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete article error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Ошибка удаления статьи", detail },
      { status: 500 }
    );
  }
}
