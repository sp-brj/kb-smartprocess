/**
 * Index all published articles into ArticleChunk table for vector search.
 *
 * For each article:
 * 1. Compute SHA256 hash of content
 * 2. Skip if existing chunks have the same hash
 * 3. Chunk article content
 * 4. Embed chunks via OpenAI
 * 5. Replace old chunks with new ones
 *
 * Run: npx tsx scripts/index-articles.ts
 */

import { PrismaClient } from "@prisma/client";
import * as crypto from "crypto";
import { chunkArticle } from "../src/lib/chunking";
import { embedTexts } from "../src/lib/embedding";

const prisma = new PrismaClient();

function sha256(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

async function indexArticles() {
  const articles = await prisma.article.findMany({
    select: {
      id: true,
      title: true,
      content: true,
      folder: { select: { name: true } },
    },
  });

  console.log(`Found ${articles.length} articles to index\n`);

  let indexed = 0;
  let skipped = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      const contentHash = sha256(article.content || "");

      // Check if chunks already exist with same hash
      const existing = await prisma.$queryRawUnsafe<Array<{ contentHash: string }>>(
        `SELECT "contentHash" FROM "ArticleChunk" WHERE "articleId" = $1 LIMIT 1`,
        article.id
      );

      if (existing.length > 0 && existing[0].contentHash === contentHash) {
        skipped++;
        continue;
      }

      // Chunk the article
      const chunks = chunkArticle({
        content: article.content || "",
        title: article.title,
        folderName: article.folder?.name,
      });

      if (chunks.length === 0) {
        skipped++;
        continue;
      }

      // Embed all chunks
      const texts = chunks.map((c) => c.content);
      const embeddings = await embedTexts(texts);

      // Delete old chunks
      await prisma.$executeRawUnsafe(
        `DELETE FROM "ArticleChunk" WHERE "articleId" = $1`,
        article.id
      );

      // Insert new chunks
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embeddingStr = `[${embeddings[i].join(",")}]`;
        const id = crypto.randomUUID();

        await prisma.$executeRawUnsafe(
          `INSERT INTO "ArticleChunk" (id, "articleId", content, "headingPath", "chunkIndex", "contentHash", embedding, "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7::vector, NOW())`,
          id,
          article.id,
          chunk.content,
          chunk.headingPath,
          chunk.chunkIndex,
          contentHash,
          embeddingStr
        );
      }

      indexed++;
      console.log(`Indexed article: ${article.title} (${chunks.length} chunks)`);
    } catch (error) {
      failed++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Failed to index "${article.title}": ${message}`);
    }
  }

  console.log(`\nDone: ${indexed} indexed, ${skipped} skipped, ${failed} failed`);
}

indexArticles()
  .catch((e) => {
    console.error("Fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
