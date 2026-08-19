# База знаний SmartProcess (kb.smartprocess.ru)

Закрытый корпоративный портал для хранения и поиска внутренней документации:
wiki-ссылки, теги, версионирование, AI-поиск по базе. Next.js 15 + Prisma +
PostgreSQL (Supabase).

## Стек

- **Frontend:** Next.js 15 (App Router), React 18, TypeScript, Tailwind CSS 4
- **Backend:** Next.js Route Handlers, NextAuth.js 4 (Credentials + API-ключи)
- **БД:** PostgreSQL (Supabase) + pgvector, Prisma 6
- **AI:** OpenAI (эмбеддинги + чат по базе знаний)
- **Файлы:** Cloudinary (картинки и вложения)
- **Тесты:** Playwright (E2E, Page Object Model)
- **Деплой:** Vercel (auto-deploy из GitHub)

## Возможности

- Статьи в Markdown (GFM), статусы DRAFT/PUBLISHED, история версий с diff и откатом
- Иерархия папок (до 3 уровней) с drag-and-drop
- Wiki-ссылки `[[статья]]`, автодополнение, панель обратных ссылок
- Теги с облаком и фильтрацией
- Полнотекстовый поиск + AI-чат по базе (векторный поиск, pgvector)
- Публичные ссылки на статьи и папки (с опциональным паролем)
- Экспорт статей в HTML / PDF / DOCX, импорт Markdown (с YAML-frontmatter)
- Роли ADMIN / EDITOR / READER, API-ключи для внешних клиентов (MCP-агент)

## Быстрый старт

```bash
npm install                 # установка зависимостей (+ prisma generate)
cp .env.example .env.local  # заполнить переменные (см. ниже)
npx prisma migrate dev      # применить миграции к БД
npm run dev                 # http://localhost:3000
```

## Переменные окружения

Файл `.env.local` (шаблон — `.env.example`):

```env
DATABASE_URL=            # строка подключения Supabase (PostgreSQL)
NEXTAUTH_SECRET=         # секрет для NextAuth
NEXTAUTH_URL=            # http://localhost:3000 локально
CLOUDINARY_CLOUD_NAME=   # для загрузки картинок и вложений
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
OPENAI_API_KEY=          # эмбеддинги и AI-чат
```

## Команды

```bash
npm run dev          # dev-сервер
npm run build        # прод-сборка (на Vercel также применяет миграции)
npm run start        # прод-сервер
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E
npm run test:cleanup # удалить тестовые данные после прогона
```

## Тесты (Playwright)

`testDir` — `e2e/specs/`, паттерн Page Object Model (`e2e/pages/`, `e2e/fixtures/`).
Всего 33 теста в 11 файлах:

```
e2e/specs/
├── auth/       # login, logout
├── articles/   # crud, drag-drop
├── folders/    # crud, nested, rename
├── admin/      # users
├── search/     # search
├── share/      # публичные ссылки
└── theme/      # светлая/тёмная тема
```

```bash
npx playwright test --project=chromium   # локально
npx tsx scripts/cleanup-test-data.ts     # очистка после прогона
```

> ⚠️ На production возможно исчерпание пула Supabase (free tier) — запускать
> малыми группами. Конфиг настроен на sequential (`fullyParallel: false`).

## База данных

```bash
npx prisma migrate dev --name <название>   # новая миграция
npx prisma studio                          # GUI
npx prisma generate                        # регенерация клиента
```

Миграции pgvector (`CREATE EXTENSION vector`, `vector(1536)`) ведутся вручную —
см. `prisma/migrations/`. На Vercel миграции применяются в `scripts/vercel-build.sh`
(production и preview; VERCEL_ENV должен указывать на изолированные БД).

## Деплой

Push в `main` → Vercel автоматически собирает и деплоит на https://kb.smartprocess.ru

## Документация

- [ARCHITECTURE.md](ARCHITECTURE.md) — архитектура, схема БД, API endpoints
- [docs/](docs/) — ADR-решения (удаление CRM, аналитики), дизайн AI-настроек, [аудит и техдолг](docs/audit-2026-07-06.md)
- [BACKLOG-MCP-API.md](BACKLOG-MCP-API.md) — дорожная карта MCP-сервера и API
- Репозиторий: https://github.com/sp-brj/kb-smartprocess
