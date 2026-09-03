/**
 * Векторный поиск по чанкам статей (pgvector, cosine distance).
 *
 * Раньше этот запрос жил внутри /api/chat и был доступен только вместе с
 * генерацией ответа через LLM. Теперь его используют и чат, и
 * /api/search/semantic (для MCP-агента и умного поиска без LLM).
 */

import { prisma } from "@/lib/prisma";
import { embedText } from "@/lib/embedding";

export interface ChunkHit {
  content: string;
  headingPath: string | null;
  id: string;
  title: string;
  slug: string;
  distance: number;
}

export interface ArticleHit {
  id: string;
  title: string;
  slug: string;
  /** Минимальная (лучшая) дистанция среди чанков статьи */
  distance: number;
  chunks: Array<{ headingPath: string | null; content: string; distance: number }>;
}

/** Порог релевантности: чанки дальше отбрасываются (cosine distance, 0 — идентично). */
export const DEFAULT_MAX_DISTANCE = 0.6;

export async function searchChunks(
  query: string,
  { limit = 5, maxDistance = DEFAULT_MAX_DISTANCE }: { limit?: number; maxDistance?: number } = {}
): Promise<ChunkHit[]> {
  const embedding = await embedText(query);
  const vectorString = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<ChunkHit[]>(
    `SELECT ac.content, ac."headingPath", a.id, a.title, a.slug,
            ac.embedding <=> $1::vector AS distance
     FROM "ArticleChunk" ac
     JOIN "Article" a ON ac."articleId" = a.id
     ORDER BY ac.embedding <=> $1::vector
     LIMIT $2::int`,
    vectorString,
    limit
  );

  return rows.filter((r) => r.distance <= maxDistance);
}

/** Группирует чанки по статьям, сортирует по лучшей дистанции. */
export function groupByArticle(hits: ChunkHit[]): ArticleHit[] {
  const map = new Map<string, ArticleHit>();
  for (const hit of hits) {
    let article = map.get(hit.id);
    if (!article) {
      article = { id: hit.id, title: hit.title, slug: hit.slug, distance: hit.distance, chunks: [] };
      map.set(hit.id, article);
    }
    article.distance = Math.min(article.distance, hit.distance);
    article.chunks.push({ headingPath: hit.headingPath, content: hit.content, distance: hit.distance });
  }
  return Array.from(map.values()).sort((a, b) => a.distance - b.distance);
}
