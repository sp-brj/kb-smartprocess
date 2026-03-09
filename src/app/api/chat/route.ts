import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-auth";
import { embedText } from "@/lib/embedding";
import { prisma } from "@/lib/prisma";
import OpenAI from "openai";

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatRequestBody {
  message: string;
  history?: ChatMessage[];
}

interface ChunkResult {
  content: string;
  headingPath: string | null;
  id: string;
  title: string;
  slug: string;
  distance: number;
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

const MAX_DISTANCE = 0.6;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  // Embed user question
  let embedding: number[];
  try {
    embedding = await embedText(message);
  } catch (error) {
    console.error("Embedding error:", error);
    return NextResponse.json(
      { error: "Сервис эмбеддингов недоступен" },
      { status: 503 }
    );
  }

  // Vector search for relevant chunks
  const vectorString = `[${embedding.join(",")}]`;

  let chunks: ChunkResult[];
  try {
    chunks = await prisma.$queryRawUnsafe<ChunkResult[]>(
      `SELECT ac.content, ac."headingPath", a.id, a.title, a.slug,
              ac.embedding <=> $1::vector AS distance
       FROM "ArticleChunk" ac
       JOIN "Article" a ON ac."articleId" = a.id
       ORDER BY ac.embedding <=> $1::vector
       LIMIT 5`,
      vectorString
    );
  } catch (error) {
    console.error("Vector search error:", error);
    return NextResponse.json(
      { error: "Ошибка поиска по базе знаний" },
      { status: 500 }
    );
  }

  // Filter by distance threshold
  const relevantChunks = chunks.filter((c) => c.distance <= MAX_DISTANCE);

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
    for (const msg of history) {
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
