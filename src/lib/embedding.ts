/**
 * Wrapper for Ollama embedding API
 * Model: qwen3-embedding:4b-q8_0 (2560 dimensions)
 */

const DEFAULT_OLLAMA_BASE_URL = "http://192.168.10.77:11434";
const EMBEDDING_MODEL = "qwen3-embedding:4b-q8_0";

export interface EmbeddingResponse {
  embeddings: number[][];
}

function getBaseUrl(): string {
  return process.env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const clientId = process.env.CF_ACCESS_CLIENT_ID;
  const clientSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  if (clientId && clientSecret) {
    headers["CF-Access-Client-Id"] = clientId;
    headers["CF-Access-Client-Secret"] = clientSecret;
  }
  return headers;
}

/**
 * Embed a single text string using Ollama API
 * Returns a vector of 2560 dimensions
 */
export async function embedText(text: string): Promise<number[]> {
  const results = await embedTexts([text]);
  return results[0];
}

/**
 * Embed multiple texts using Ollama API
 * Returns an array of vectors (2560 dimensions each)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}/api/embed`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: texts,
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Ollama embedding request failed: ${message}`);
    throw new Error(`Failed to connect to Ollama at ${baseUrl}: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "unknown");
    console.error(`Ollama embedding error ${response.status}: ${body}`);
    throw new Error(
      `Ollama embedding request failed with status ${response.status}: ${body}`
    );
  }

  let data: EmbeddingResponse;
  try {
    data = (await response.json()) as EmbeddingResponse;
  } catch {
    console.error("Failed to parse Ollama embedding response as JSON");
    throw new Error("Invalid JSON response from Ollama embedding API");
  }

  if (
    !data.embeddings ||
    !Array.isArray(data.embeddings) ||
    data.embeddings.length !== texts.length
  ) {
    console.error("Unexpected Ollama embedding response structure:", data);
    throw new Error(
      `Expected ${texts.length} embeddings, got ${data.embeddings?.length ?? 0}`
    );
  }

  return data.embeddings;
}
