/**
 * Скрипт для безопасной очистки тестовых данных
 *
 * Удаляет только данные, созданные E2E тестами:
 * - Пользователи с email вида *@example.com
 * - Статьи с названиями содержащими timestamp (13 цифр)
 * - Папки с названиями содержащими timestamp
 *
 * Запуск: npx tsx scripts/cleanup-test-data.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Паттерны для определения тестовых данных
const TEST_EMAIL_PATTERN = "@example.com";
const TIMESTAMP_PATTERN = /\d{13}/; // 13-значный timestamp
// Постоянный тестовый пользователь, который НЕ удаляется
const PERMANENT_TEST_USER = "e2e-test@example.com";

async function cleanupTestData() {
  console.log("🧹 Начинаю очистку тестовых данных...\n");

  // 1. Найти тестовых пользователей (кроме постоянного)
  const testUsers = await prisma.user.findMany({
    where: {
      AND: [
        {
          email: {
            contains: TEST_EMAIL_PATTERN,
          },
        },
        {
          email: {
            not: PERMANENT_TEST_USER,
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
    },
  });

  console.log(`📧 Найдено тестовых пользователей: ${testUsers.length}`);
  testUsers.forEach((u) => console.log(`   - ${u.email}`));

  // 2. Найти тестовые статьи (по названию с timestamp или по автору)
  const testArticles = await prisma.article.findMany({
    where: {
      OR: [
        // Статьи тестовых пользователей
        {
          authorId: {
            in: testUsers.map((u) => u.id),
          },
        },
        // Статьи с timestamp в названии (на случай если автор удалён)
        {
          title: {
            contains: "Test Article",
          },
        },
        {
          title: {
            contains: "Тестовая статья",
          },
        },
        {
          title: {
            contains: "Searchable Article",
          },
        },
        {
          title: {
            contains: "Article in Folder",
          },
        },
        {
          title: {
            contains: "Shared Article",
          },
        },
        {
          title: {
            contains: "Article to Edit",
          },
        },
        {
          title: {
            contains: "Article to Delete",
          },
        },
      ],
    },
    select: {
      id: true,
      title: true,
      authorId: true,
    },
  });

  // Фильтруем только те, что имеют timestamp в названии
  // Статьи постоянного тестового пользователя удаляются только если имеют timestamp
  const articlesToDelete = testArticles.filter(
    (a) =>
      TIMESTAMP_PATTERN.test(a.title) ||
      testUsers.some((u) => u.id === a.authorId)
  );

  console.log(`\n📄 Найдено тестовых статей: ${articlesToDelete.length}`);
  articlesToDelete.forEach((a) => console.log(`   - ${a.title}`));

  // 3. Найти тестовые папки
  const testFolders = await prisma.folder.findMany({
    where: {
      OR: [
        {
          name: {
            contains: "Test Folder",
          },
        },
        {
          name: {
            contains: "Folder for Article",
          },
        },
        {
          name: {
            contains: "Nav Folder",
          },
        },
        {
          name: {
            contains: "Тестовая Папка",
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
    },
  });

  // Фильтруем только с timestamp
  const foldersToDelete = testFolders.filter((f) =>
    TIMESTAMP_PATTERN.test(f.name)
  );

  console.log(`\n📁 Найдено тестовых папок: ${foldersToDelete.length}`);
  foldersToDelete.forEach((f) => console.log(`   - ${f.name}`));

  // 4. Удаление (в правильном порядке из-за foreign keys)

  // 4.1 Удалить ShareLinks для тестовых статей
  if (articlesToDelete.length > 0) {
    const deletedLinks = await prisma.shareLink.deleteMany({
      where: {
        articleId: {
          in: articlesToDelete.map((a) => a.id),
        },
      },
    });
    console.log(`\n🔗 Удалено ссылок для шаринга: ${deletedLinks.count}`);
  }

  // 4.2 Удалить тестовые статьи
  if (articlesToDelete.length > 0) {
    const deletedArticles = await prisma.article.deleteMany({
      where: {
        id: {
          in: articlesToDelete.map((a) => a.id),
        },
      },
    });
    console.log(`📄 Удалено статей: ${deletedArticles.count}`);
  }

  // 4.3 Удалить тестовые папки
  if (foldersToDelete.length > 0) {
    const deletedFolders = await prisma.folder.deleteMany({
      where: {
        id: {
          in: foldersToDelete.map((f) => f.id),
        },
      },
    });
    console.log(`📁 Удалено папок: ${deletedFolders.count}`);
  }

  // 4.4 Удалить тестовых пользователей
  if (testUsers.length > 0) {
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: {
          in: testUsers.map((u) => u.id),
        },
      },
    });
    console.log(`👤 Удалено пользователей: ${deletedUsers.count}`);
  }

  console.log("\n✅ Очистка завершена!");
}

// Режим dry-run для безопасности
const isDryRun = process.argv.includes("--dry-run");

if (isDryRun) {
  console.log("⚠️  РЕЖИМ DRY-RUN: данные НЕ будут удалены\n");
}

cleanupTestData()
  .catch((e) => {
    console.error("❌ Ошибка:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
