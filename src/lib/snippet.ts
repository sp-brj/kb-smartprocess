/**
 * Сниппеты для поиска.
 *
 * Раньше сниппет резался из сырого Markdown, и в выдаче светились
 * `<div align="center"><h2>…`, `**жирный**`, слуги ссылок. Теперь сначала
 * снимаем разметку, потом ищем вхождение запроса.
 */

const HTML_ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
};

/** Снимает HTML-теги и Markdown-разметку, оставляя читаемый текст. */
export function stripMarkup(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, title, alias) => alias || title)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+\[[ xX]\]\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/^\s*\|?[\s:-]+\|[\s|:-]*$/gm, " ")
    .replace(/\|/g, " ")
    .replace(/[*_~`]+/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot);/g, (m) => HTML_ENTITIES[m] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export interface SnippetOptions {
  /** Символов до вхождения запроса */
  before?: number;
  /** Символов после вхождения запроса */
  after?: number;
  /** Длина сниппета, если запрос в тексте не найден */
  fallback?: number;
}

/** Фрагмент текста вокруг первого вхождения запроса (без разметки). */
export function makeSnippet(
  content: string,
  query: string,
  { before = 50, after = 100, fallback = 150 }: SnippetOptions = {}
): string {
  const text = stripMarkup(content);
  const needle = query.trim().toLowerCase();
  const pos = needle ? text.toLowerCase().indexOf(needle) : -1;

  if (pos === -1) {
    return text.slice(0, fallback) + (text.length > fallback ? "…" : "");
  }

  const start = Math.max(0, pos - before);
  const end = Math.min(text.length, pos + needle.length + after);
  return (
    (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "")
  );
}
