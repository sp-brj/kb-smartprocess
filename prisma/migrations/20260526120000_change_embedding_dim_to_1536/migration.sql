-- Switch embeddings provider from Ollama (qwen3-embedding:4b, 2560 dim)
-- to OpenAI (text-embedding-3-small, 1536 dim).
-- Old chunks must be regenerated — drop them all, the reindex script
-- will repopulate the table.

TRUNCATE TABLE "ArticleChunk";

ALTER TABLE "ArticleChunk"
  ALTER COLUMN "embedding" TYPE vector(1536);
