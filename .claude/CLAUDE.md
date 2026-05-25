# Инструкции для Claude Code

## В начале каждого чата

**ОБЯЗАТЕЛЬНО** прочитать файл `ARCHITECTURE.md` для понимания контекста проекта:
- Что это за приложение
- Технологический стек
- Структура проекта и БД
- Существующий функционал
- API endpoints

## После завершения задачи

**ВАЖНО:** Задача НЕ считается завершённой до деплоя. Не говорить пользователю "готово" или "сделано" пока изменения не задеплоены.

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

4. **СПРОСИТЬ пользователя:** "Закоммитить и запушить на GitHub?"
   - Дождаться подтверждения
   - Когда пользователь скажет "да", "давай", "делай" или подобное - выполнить шаги 5-6

5. **Создать коммит** с описанием изменений:
   ```bash
   git add <измененные файлы>
   git commit -m "Описание изменений"
   ```

6. **Запушить на GitHub**:
   ```bash
   git push origin main
   ```
   - Vercel автоматически задеплоит изменения после пуша
   - Деплой URL: https://kb.smartprocess.ru

7. **Только после успешного пуша** сообщить пользователю что задача завершена

### Чеклист для auth-изменений

При изменении авторизации (добавление Bearer Token, API Key, и т.д.):

- [ ] Проверить `src/middleware.ts` — не блокирует ли нужные routes
- [ ] API routes должны быть в исключениях matcher: `"/((?!api|login|...))"`
- [ ] Тест после деплоя: `curl -H "Authorization: Bearer xxx" /api/...`

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
- `CrmPage` - CRM модуль (навигация, dashboard)

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

## CRM модуль

CRM модуль расположен в `/crm` и предназначен для управления клиентами и проектами консалтинга по 1С.

### Структура URL

```
/crm                        # Dashboard с виджетами
/crm/clients                # Список клиентов
/crm/clients/new            # Создание клиента
/crm/clients/[id]           # Карточка клиента
/crm/clients/[id]/edit      # Редактирование клиента
/crm/projects               # Список проектов (таблица + воронка)
/crm/projects/new           # Создание проекта
/crm/projects/[id]          # Детали проекта (задачи, оплаты)
/crm/projects/[id]/edit     # Редактирование проекта
/crm/projects/[id]/kanban   # Канбан задач проекта
/crm/tasks                  # Мои задачи
/crm/tasks/new              # Создание задачи
/crm/time                   # Журнал времени
/crm/time/report            # Отчёт по времени
/crm/settings/statuses      # Настройка статусов (ADMIN)
```

### CRM API endpoints

| Группа | Endpoints |
|--------|-----------|
| Клиенты | `GET/POST /api/clients`, `GET/PATCH/DELETE /api/clients/[id]` |
| Контакты | `GET/POST /api/clients/[id]/contacts`, `PATCH/DELETE .../contacts/[contactId]` |
| Реквизиты | `GET/POST /api/clients/[id]/bank-accounts`, `PATCH/DELETE .../bank-accounts/[accountId]` |
| Статусы | `GET/POST /api/project-statuses`, `PATCH/DELETE /api/project-statuses/[id]` |
| Проекты | `GET/POST /api/projects`, `GET/PATCH/DELETE /api/projects/[id]`, `PATCH .../status` |
| Задачи | `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/[id]`, `PATCH .../status` |
| Чеклист | `GET/POST /api/tasks/[id]/checklist`, `PATCH/DELETE .../checklist/[itemId]` |
| Время | `GET/POST /api/time-entries`, `GET/PATCH/DELETE .../[id]`, `GET .../report` |
| Оплаты | `GET/POST /api/payments`, `GET/PATCH/DELETE /api/payments/[id]` |

### Ключевые типы (enums)

```typescript
// ProjectStatusType
LEAD | NEGOTIATION | CONTRACT | WORK | DONE | CANCELLED

// ProjectType
IMPLEMENTATION | CONSULTING | DEVELOPMENT | SUPPORT

// TaskStatus
TODO | IN_PROGRESS | REVIEW | DONE

// TaskPriority
LOW | MEDIUM | HIGH | URGENT

// WorkType
CONSULTATION | DEVELOPMENT | TRAINING | TESTING | DOCUMENTATION | MEETING | OTHER

// PaymentType
ADVANCE | MILESTONE | FINAL

// PaymentStatus
PENDING | RECEIVED | CANCELLED
```

### CRM компоненты

- `Breadcrumbs` - хлебные крошки (`/src/components/crm/Breadcrumbs.tsx`)
- Header содержит переключатель модулей KB/CRM
- CRM layout (`/crm/layout.tsx`) содержит навигационные табы

### E2E тесты CRM

- Page Object: `CrmPage` (`/e2e/pages/crm.page.ts`)
- Спеки: `/e2e/specs/crm/navigation.spec.ts`

### Авторизация в API

Использовать `authenticateRequest()` из `@/lib/api-auth`:

```typescript
const auth = await authenticateRequest(request);
if (!auth.authenticated) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Проверка роли
if (auth.userRole !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Получить ID пользователя
const userId = auth.userId;
```

## Репозиторий

GitHub: https://github.com/sp-brj/kb-smartprocess
