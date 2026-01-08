# Инструкции для Claude Code

## После завершения задачи

После завершения любой задачи по изменению кода:

1. **Собрать проект** для проверки ошибок:
   ```bash
   npm run build
   ```

2. **Запустить E2E тесты** через Playwright:
   ```bash
   npx playwright test --project=chromium
   ```
   - Убедиться что все тесты проходят
   - При необходимости исправить код или обновить тесты
   - Для быстрых проверок можно запускать только chromium проект

3. **Очистить тестовые данные** после тестов:
   ```bash
   npx tsx scripts/cleanup-test-data.ts
   ```
   - ОБЯЗАТЕЛЬНО запускать после каждого прогона тестов
   - Удаляет тестовые папки и статьи с timestamp в названии

4. **Создать коммит** с описанием изменений:
   ```bash
   git add <измененные файлы>
   git commit -m "Описание изменений"
   ```

5. **Запушить на GitHub**:
   ```bash
   git push origin main
   ```

## Стандарты кодирования

- Использовать ESLint конфигурацию проекта (`eslint-config-next`)
- Следовать паттернам существующего кода
- В React компонентах:
  - Функции загрузки данных объявлять внутри `useEffect`
  - Для перезагрузки данных использовать state-триггер (`reloadCount`)
  - Не вызывать setState синхронно в эффектах
- Добавлять `data-testid` атрибуты для элементов UI (используются в тестах)

## Структура проекта

- `/src/components/` - React компоненты
- `/src/app/` - Next.js App Router страницы и API
- `/prisma/` - схема базы данных
- `/e2e/` - Playwright тесты
  - `/e2e/pages/` - Page Objects (паттерн POM)
  - `/e2e/fixtures/` - Playwright fixtures для авторизации и данных
  - `/e2e/specs/` - тестовые спецификации по категориям

## E2E тесты

Тесты используют **Page Object Model** для удобного взаимодействия с UI:

```typescript
import { test, expect } from "../../fixtures/test";

test("example", async ({ authenticatedPage }) => {
  await authenticatedPage.createFolder("My Folder");
  await authenticatedPage.expectFolderExists("my-folder");
});
```

Основные Page Objects:
- `LoginPage` - страница логина
- `DashboardPage` - главная страница, сайдбар, тема
- `ArticleEditorPage` - создание/редактирование статей
- `ArticleViewPage` - просмотр статьи
- `AdminUsersPage` - админ-панель пользователей

## Репозиторий

GitHub: https://github.com/sp-brj/kb-smartprocess
