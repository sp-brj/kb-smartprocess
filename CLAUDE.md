# Инструкции для Claude Code

## В начале каждого чата

**ОБЯЗАТЕЛЬНО** прочитать файл `ARCHITECTURE.md` для понимания контекста проекта:
- Что это за приложение
- Технологический стек
- Структура проекта и БД
- Существующий функционал
- API endpoints

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

### ESLint правила React Hooks (Vercel build)

Vercel использует строгий ESLint. Частые ошибки:

1. **`react-hooks/set-state-in-effect`** - нельзя вызывать setState в useEffect
   ```typescript
   // ❌ Плохо
   useEffect(() => {
     setState(value);
   }, []);

   // ✅ Хорошо - использовать useReducer
   const [state, dispatch] = useReducer(reducer, initial);
   useEffect(() => {
     dispatch({ type: "SET", value });
   }, []);

   // ✅ Или useSyncExternalStore для внешнего состояния
   const theme = useSyncExternalStore(subscribe, getSnapshot);
   ```

2. **`react-hooks/refs`** - нельзя читать ref.current во время рендера
   ```typescript
   // ❌ Плохо
   const index = ref.current === key ? 0 : ref.current.index;

   // ✅ Хорошо - вычислять из state
   const index = state.key !== currentKey ? 0 : state.index;
   ```

3. **Unused variables** - удалять неиспользуемые импорты и переменные

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

### Запуск тестов

**Локально (рекомендуется для разработки):**
```bash
npx playwright test --project=chromium
```

**На production:**
```bash
BASE_URL=https://kb-smartprocess.vercel.app npx playwright test
```

⚠️ **Важно:** При запуске на production возможны ошибки из-за исчерпания пула соединений Supabase (ограничение free tier). В этом случае:
- Запускать тесты малыми группами (по 5-10)
- Или использовать локальный dev сервер

### Известные проблемы E2E

1. **Next.js кэширование** - после создания данных страница может показывать старые данные. Решение: `page.reload()` перед проверкой.

2. **localStorage draft** - ArticleEditor сохраняет черновик в localStorage. При тестах создания статьи в папке нужно очистить: `localStorage.removeItem("article-draft")`

3. **Supabase pool exhaustion** - при массовых запросах база возвращает "max clients reached". Конфиг настроен на sequential запуск (`fullyParallel: false`) для production.

## Функционал базы знаний

### Wiki-ссылки
- Синтаксис: `[[название статьи]]` или `[[статья|текст ссылки]]`
- Автодополнение при вводе `[[` в редакторе
- Панель обратных ссылок (BacklinksPanel) показывает какие статьи ссылаются на текущую
- Битые ссылки подсвечиваются красным (класс `.wikilink-broken`)

### Теги
- TagSelector в редакторе для добавления тегов
- Создание новых тегов "на лету"
- TagCloud в сайдбаре с количеством статей
- Страницы `/tags` (все теги) и `/tags/[slug]` (статьи по тегу)

### История изменений
- Автоматическое сохранение версий при каждом изменении
- Кнопка "История" на странице статьи
- VersionHistoryModal показывает список версий
- VersionDiffViewer для визуального сравнения
- Откат к любой предыдущей версии

### API endpoints
- `/api/articles/suggestions` - автодополнение wiki-ссылок
- `/api/articles/[id]/backlinks` - обратные ссылки
- `/api/articles/[id]/tags` - теги статьи (GET, PUT, POST)
- `/api/articles/[id]/versions` - список версий
- `/api/articles/[id]/versions/[versionId]` - конкретная версия
- `/api/articles/[id]/versions/[versionId]/diff` - diff между версиями
- `/api/articles/[id]/versions/[versionId]/revert` - откат
- `/api/tags` - CRUD тегов

## Репозиторий

GitHub: https://github.com/sp-brj/kb-smartprocess
