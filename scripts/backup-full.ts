/**
 * Полный бэкап всех таблиц через Prisma.
 *
 * Запуск: npx tsx scripts/backup-full.ts [папка]
 *   По умолчанию: backups/<YYYY-MM-DD>/data.json
 *
 * Что внутри:
 *   - Все таблицы KB
 *   - Пароли пользователей (bcrypt хеш) включены — нужно для восстановления входа
 *   - Эмбеддинги (ArticleChunk.embedding) включены
 *
 * Восстановление:
 *   1. Создать новую БД, прогнать миграции: npx prisma migrate deploy
 *   2. Запустить восстанавливающий скрипт (см. restore-full.ts)
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

const TABLES = [
  "user", "apiKey", "folder", "article", "articleChunk", "shareLink",
  "folderShareLink", "articleLink", "tag", "articleTag", "articleVersion",
  "image", "attachment", "articleView", "searchQuery",
] as const;

async function main() {
  const argDir = process.argv[2];
  const date = new Date().toISOString().split("T")[0];
  const dir = argDir || path.join("backups", date);

  fs.mkdirSync(dir, { recursive: true });
  console.log(`Backing up to: ${dir}\n`);

  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    process.stdout.write(`  ${table}... `);
    try {
      // @ts-expect-error — динамический доступ к моделям Prisma
      const rows = await prisma[table].findMany();
      data[table] = rows;
      counts[table] = rows.length;
      console.log(`${rows.length}`);
    } catch (e) {
      console.log("SKIP");
      console.log("    →", e instanceof Error ? e.message : String(e));
      counts[table] = -1;
    }
  }

  const backup = {
    exportedAt: new Date().toISOString(),
    schemaSource: "prisma/schema.prisma в git",
    counts,
    data,
  };

  const filename = path.join(dir, "data.json");
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));

  const sizeMB = (fs.statSync(filename).size / 1024 / 1024).toFixed(2);
  console.log(`\n✅ ${filename} (${sizeMB} MB)`);
  console.log("\nСтрок по таблицам:");
  for (const [t, c] of Object.entries(counts)) {
    if (c >= 0) console.log(`  ${t.padEnd(20)} ${c}`);
  }
}

main()
  .catch((e) => {
    console.error("\n❌ Backup failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
