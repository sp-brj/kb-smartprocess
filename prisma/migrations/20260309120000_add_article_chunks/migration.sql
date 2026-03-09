-- EnableExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "ArticleChunk" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "headingPath" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embedding" vector(2560) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleChunk_articleId_idx" ON "ArticleChunk"("articleId");

-- AddForeignKey
ALTER TABLE "ArticleChunk" ADD CONSTRAINT "ArticleChunk_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;
