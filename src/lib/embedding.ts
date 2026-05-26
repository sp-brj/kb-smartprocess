import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
export const EMBEDDING_DIMENSIONS = 1536;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const openai = getClient();

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  });

  if (response.data.length !== texts.length) {
    throw new Error(
      `Expected ${texts.length} embeddings, got ${response.data.length}`
    );
  }

  return response.data.map((item) => item.embedding);
}
