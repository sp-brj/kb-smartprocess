import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import {
  DEFAULT_MAX_DISTANCE,
  groupByArticle,
  searchChunks,
} from "@/lib/vector-search";

/**
 * GET /api/search/semantic?q=…&limit=5&maxDistance=0.6
 *
 * Семантический поиск по смыслу (эмбеддинг запроса + pgvector), БЕЗ вызова LLM.
 * Возвращает статьи с лучшими чанками и дистанцией. Нужен MCP-агенту и умному
 * поиску в UI: раньше вектор был заперт внутри /api/chat вместе с генерацией.
 */
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Каждый запрос — вызов эмбеддингов OpenAI: лимитируем, как и чат.
  const rl = await rateLimit(
    `semantic:${auth.userId ?? clientIp(request.headers)}`,
    60,
    60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите немного." },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ query, articles: [] });
  }

  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 20) : 5;
  const rawDistance = Number(searchParams.get("maxDistance"));
  const maxDistance =
    Number.isFinite(rawDistance) && rawDistance > 0 && rawDistance <= 1
      ? rawDistance
      : DEFAULT_MAX_DISTANCE;

  try {
    // Берём чанков с запасом: несколько чанков одной статьи схлопываются.
    const hits = await searchChunks(query, { limit: limit * 3, maxDistance });
    const articles = groupByArticle(hits).slice(0, limit);
    return NextResponse.json({ query, maxDistance, articles });
  } catch (error) {
    console.error("Semantic search error:", error);
    return NextResponse.json(
      { error: "Сервис семантического поиска недоступен" },
      { status: 503 }
    );
  }
}
