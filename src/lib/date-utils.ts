/**
 * Форматирует дату относительно текущего времени
 * "сегодня", "вчера", "3 дня назад", "2 недели назад", "15 янв"
 */
export function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "сегодня";
  }
  if (diffDays === 1) {
    return "вчера";
  }
  if (diffDays < 7) {
    return `${diffDays} ${pluralize(diffDays, "день", "дня", "дней")} назад`;
  }
  if (diffDays < 14) {
    return "неделю назад";
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} ${pluralize(weeks, "неделю", "недели", "недель")} назад`;
  }
  // Для более старых дат показываем абсолютную дату
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;

  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1) return one;
  if (mod10 >= 2 && mod10 <= 4) return few;
  return many;
}
