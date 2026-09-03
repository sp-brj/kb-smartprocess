/**
 * Полная переиндексация статей для AI-чата.
 *
 * Вся логика (хеш «что проиндексировано», чанки, эмбеддинги, транзакционная
 * запись) живёт в src/lib/reindex.ts и та же, что при сохранении через API.
 * Скрипт лишь обходит все статьи. Черновики индекс не получают (как и в API),
 * их старые чанки удаляются. Уже актуальные статьи пропускаются по хешу.
 *
 * Запуск: npx tsx scripts/index-articles.ts
 */

import { prisma } from "../src/lib/prisma";
import { reindexArticle } from "../src/lib/reindex";

async function main() {
  const articles = await prisma.article.findMany({
    select: { id: true, title: true, status: true },
    orderBy: { updatedAt: "desc" },
  });

  console.log(`Found ${articles.length} articles\n`);

  let ok = 0;
  let failed = 0;

  for (const article of articles) {
    try {
      await reindexArticle(article.id);
      ok++;
      console.log(`✓ ${article.title} (${article.status})`);
    } catch (error) {
      failed++;
      console.error(
        `✗ ${article.title}:`,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  console.log(`\nDone: ${ok} ok, ${failed} failed`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
