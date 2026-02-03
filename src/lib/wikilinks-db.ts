/**
 * Серверные функции для работы с ArticleLink в БД
 */

import { prisma } from "@/lib/prisma";
import { extractWikilinks, generateSlug } from "@/lib/wikilinks";

/**
 * Синхронизирует wiki-ссылки статьи с БД
 * Удаляет старые и создаёт новые связи
 */
export async function syncArticleLinks(articleId: string, content: string): Promise<void> {
  // Удаляем старые ссылки
  await prisma.articleLink.deleteMany({ where: { sourceId: articleId } });

  await createArticleLinksInternal(articleId, content);
}

/**
 * Создаёт wiki-ссылки для новой статьи (без удаления старых)
 */
export async function createArticleLinks(articleId: string, content: string): Promise<void> {
  await createArticleLinksInternal(articleId, content);
}

/**
 * Внутренняя функция создания ссылок
 */
async function createArticleLinksInternal(articleId: string, content: string): Promise<void> {
  const wikilinks = extractWikilinks(content);
  if (wikilinks.length === 0) return;

  // Найти существующие статьи по заголовкам
  const titles = wikilinks.map((l) => l.title);
  const existingArticles = await prisma.article.findMany({
    where: {
      OR: [
        { title: { in: titles, mode: "insensitive" } },
        { slug: { in: titles.map((t) => generateSlug(t)) } },
      ],
    },
    select: { id: true, title: true, slug: true },
  });

  // Создать map для быстрого поиска
  const articleMap = new Map<string, string>();
  existingArticles.forEach((a) => {
    articleMap.set(a.title.toLowerCase(), a.id);
    articleMap.set(a.slug, a.id);
  });

  // Создать связи
  const linkData = wikilinks.map((link) => ({
    sourceId: articleId,
    targetId:
      articleMap.get(link.title.toLowerCase()) ||
      articleMap.get(generateSlug(link.title)) ||
      null,
    targetTitle: link.title,
  }));

  await prisma.articleLink.createMany({
    data: linkData,
    skipDuplicates: true,
  });
}

/**
 * Связывает "битые" ссылки из других статей с новой статьёй
 */
export async function linkOrphanedReferences(articleId: string, title: string): Promise<void> {
  const slug = generateSlug(title);

  await prisma.articleLink.updateMany({
    where: {
      targetId: null,
      OR: [
        { targetTitle: { equals: title, mode: "insensitive" } },
        { targetTitle: { equals: slug, mode: "insensitive" } },
      ],
    },
    data: { targetId: articleId },
  });
}
