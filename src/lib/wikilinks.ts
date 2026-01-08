/**
 * Утилиты для работы с wiki-ссылками [[название статьи]]
 */

export interface WikiLink {
  title: string;
  alias?: string;
}

/**
 * Извлекает все wiki-ссылки из текста
 * Поддерживает форматы: [[название]] и [[название|алиас]]
 */
export function extractWikilinks(content: string): WikiLink[] {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  const links: WikiLink[] = [];
  const seen = new Set<string>();

  let match;
  while ((match = regex.exec(content)) !== null) {
    const title = match[1].trim();
    const alias = match[2]?.trim();

    // Избегаем дубликатов
    if (!seen.has(title)) {
      seen.add(title);
      links.push({ title, alias });
    }
  }

  return links;
}

/**
 * Транслитерация и генерация slug из заголовка
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[а-яё]/g, (char) => {
      const map: Record<string, string> = {
        а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
        ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
        н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
        ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch",
        ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      };
      return map[char] || char;
    })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

/**
 * Преобразует название статьи в slug для поиска
 */
export function titleToSlug(title: string): string {
  return generateSlug(title);
}
