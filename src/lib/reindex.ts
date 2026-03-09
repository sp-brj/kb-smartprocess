/**
 * Reindex a single article's chunks for AI chat search.
 * Called after article create/update/delete operations.
 */

import { prisma } from "@/lib/prisma";
import { chunkArticle } from "@/lib/chunking";
import { embedTexts } from "@/lib/embedding";
import crypto from "crypto";

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Reindex a single article's chunks for AI chat search.
 * Runs asynchronously — does not block the caller.
 */
export async function reindexArticle(articleId: string): Promise<void> {
  // 1. Fetch article with folder
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      folder: { select: { name: true } },
    },
  });

  if (!article) {
    return;
  }

  // Only reindex PUBLISHED articles
  if (article.status !== "PUBLISHED") {
    // If article is not published, remove any existing chunks
    await deleteArticleChunks(articleId);
    return;
  }

  // 2. Compute SHA256 of content
  const contentHash = sha256(article.content || "");

  // 3. Check if hash changed (query existing chunks' contentHash)
  const existing = await prisma.$queryRawUnsafe<Array<{ contentHash: string }>>(
    `SELECT "contentHash" FROM "ArticleChunk" WHERE "articleId" = $1 LIMIT 1`,
    articleId
  );

  // 4. If unchanged, skip
  if (existing.length > 0 && existing[0].contentHash === contentHash) {
    return;
  }

  // 5. Chunk the article
  const chunks = chunkArticle({
    content: article.content || "",
    title: article.title,
    folderName: article.folder?.name,
  });

  if (chunks.length === 0) {
    await deleteArticleChunks(articleId);
    return;
  }

  // 6. Embed all chunks
  const texts = chunks.map((c) => c.content);
  const embeddings = await embedTexts(texts);

  // 7. DELETE old chunks
  await prisma.$executeRawUnsafe(
    `DELETE FROM "ArticleChunk" WHERE "articleId" = $1`,
    articleId
  );

  // 8. INSERT new chunks with vector
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embeddingStr = `[${embeddings[i].join(",")}]`;
    const id = crypto.randomUUID();

    await prisma.$executeRawUnsafe(
      `INSERT INTO "ArticleChunk" (id, "articleId", content, "headingPath", "chunkIndex", "contentHash", embedding, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, NOW())`,
      id,
      articleId,
      chunk.content,
      chunk.headingPath,
      chunk.chunkIndex,
      contentHash,
      embeddingStr
    );
  }
}

/**
 * Delete all chunks for an article (when article is deleted)
 */
export async function deleteArticleChunks(articleId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "ArticleChunk" WHERE "articleId" = ${articleId}`;
}
