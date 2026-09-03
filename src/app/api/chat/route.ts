import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { DEFAULT_MAX_DISTANCE, searchChunks, type ChunkHit } from "@/lib/vector-search";
import OpenAI from "openai";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

interface SourceArticle {
  id: string;
  title: string;
  slug: string;
}

const SYSTEM_PROMPT = `Ты — ассистент базы знаний SmartProcess.
Отвечай ТОЛЬКО на основе предоставленного контекста.
Если ответа нет в контексте — скажи "Не нашёл информации по этому вопросу в базе знаний".
В конце ответа укажи источники: названия статей со ссылками.
Отвечай на русском языке, кратко и по делу.`;

/** Сколько последних реплик истории передаём модели (защита от раздувания контекста). */
const MAX_HISTORY = 10;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Лимит на дорогие запросы к OpenAI (защита от денежного DoS).
  const rl = await rateLimit(
    `chat:${auth.userId ?? clientIp(request.headers)}`,
    20,
    60 * 1000
  );
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Слишком много запросов. Подождите немного." },
      { status: 429 }
    );
  }

  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный JSON" },
      { status: 400 }
    );
  }

  const { message, history } = body;

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "Сообщение не может быть пустым" },
      { status: 400 }
    );
  }

  // Эмбеддинг вопроса + векторный поиск (общий модуль с /api/search/semantic)
  let relevantChunks: ChunkHit[];
  try {
    relevantChunks = await searchChunks(message, {
      limit: 5,
      maxDistance: DEFAULT_MAX_DISTANCE,
    });
  } catch (error) {
    console.error("Vector search error:", error);
    return NextResponse.json(
      { error: "Поиск по базе знаний недоступен" },
      { status: 503 }
    );
  }

  // Build context from chunks
  const contextText = relevantChunks
    .map((c) => {
      const prefix = c.headingPath ? `[${c.headingPath}] ` : "";
      return `${prefix}${c.content}`;
    })
    .join("\n\n---\n\n");

  // Deduplicate source articles
  const sourcesMap = new Map<string, SourceArticle>();
  for (const chunk of relevantChunks) {
    if (!sourcesMap.has(chunk.id)) {
      sourcesMap.set(chunk.id, {
        id: chunk.id,
        title: chunk.title,
        slug: chunk.slug,
      });
    }
  }
  const sources = Array.from(sourcesMap.values());

  // Build messages for OpenAI
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];

  if (contextText.length > 0) {
    messages.push({
      role: "system",
      content: `Контекст из базы знаний:\n\n${contextText}`,
    });
  }

  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-MAX_HISTORY)) {
      if (msg.role === "user" || msg.role === "assistant") {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }
  }

  messages.push({ role: "user", content: message });

  // Stream response from OpenAI
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  let openaiStream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
  try {
    openaiStream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });
  } catch (error) {
    console.error("OpenAI error:", error);
    return NextResponse.json(
      { error: "Ошибка генерации ответа" },
      { status: 502 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of openaiStream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content })}\n\n`
              )
            );
          }
        }

        // Send sources
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "sources", sources })}\n\n`
          )
        );

        // Done signal
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (error) {
        console.error("Stream error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: "Ошибка при генерации ответа" })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
