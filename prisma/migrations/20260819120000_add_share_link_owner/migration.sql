-- AlterTable
ALTER TABLE "ShareLink" ADD COLUMN "createdById" TEXT;

-- AlterTable
ALTER TABLE "FolderShareLink" ADD COLUMN "createdById" TEXT;

-- Backfill: владельцем существующих ссылок на статьи считаем автора статьи.
-- Для ссылок на папки владельца восстановить не из чего — остаются NULL
-- (такие legacy-ссылки может отозвать только ADMIN).
UPDATE "ShareLink" AS sl
SET "createdById" = a."authorId"
FROM "Article" AS a
WHERE a."id" = sl."articleId" AND sl."createdById" IS NULL;

-- CreateIndex
CREATE INDEX "ShareLink_createdById_idx" ON "ShareLink"("createdById");

-- CreateIndex
CREATE INDEX "FolderShareLink_createdById_idx" ON "FolderShareLink"("createdById");

-- AddForeignKey
ALTER TABLE "ShareLink" ADD CONSTRAINT "ShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FolderShareLink" ADD CONSTRAINT "FolderShareLink_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
