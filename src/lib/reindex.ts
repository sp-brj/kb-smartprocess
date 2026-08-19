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

  // 7-8. Перезапись чанков одной транзакцией: DELETE + пакетные INSERT.
  // Раньше был отдельный INSERT на каждый чанк (N+1 круговых обходов БД), а
  // падение посреди цикла оставляло статью с частичным индексом.
  const COLUMNS = 7;
  const ROWS_PER_STATEMENT = 100; // держим число плейсхолдеров далеко от лимита PG

  const statements = [
    prisma.$executeRawUnsafe(
      `DELETE FROM "ArticleChunk" WHERE "articleId" = $1`,
      articleId
    ),
  ];

  for (let offset = 0; offset < chunks.length; offset += ROWS_PER_STATEMENT) {
    const batch = chunks.slice(offset, offset + ROWS_PER_STATEMENT);
    const values: unknown[] = [];
    const rows = batch.map((chunk, i) => {
      const base = i * COLUMNS;
      values.push(
        crypto.randomUUID(),
        articleId,
        chunk.content,
        chunk.headingPath,
        chunk.chunkIndex,
        contentHash,
        `[${embeddings[offset + i].join(",")}]`
      );
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}::vector, NOW())`;
    });

    statements.push(
      prisma.$executeRawUnsafe(
        `INSERT INTO "ArticleChunk" (id, "articleId", content, "headingPath", "chunkIndex", "contentHash", embedding, "createdAt")
         VALUES ${rows.join(", ")}`,
        ...values
      )
    );
  }

  await prisma.$transaction(statements);
}

/**
 * Delete all chunks for an article (when article is deleted)
 */
export async function deleteArticleChunks(articleId: string): Promise<void> {
  await prisma.$executeRaw`DELETE FROM "ArticleChunk" WHERE "articleId" = ${articleId}`;
}
