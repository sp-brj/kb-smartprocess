# CLAUDE.md — sp-kb (kb.smartprocess.ru)

База знаний SmartProcess: wiki-ссылки `[[...]]`, теги, версионирование, AI-чат (RAG).
Next.js 15 (App Router) + Prisma 6 + Supabase Postgres (pgvector) + NextAuth 4 + OpenAI + Cloudinary.
Подробности: `README.md`, `ARCHITECTURE.md`, `docs/claude-details.md` (паттерны кода, чеклисты),
`docs/audit-2026-07-06.md` (аудит: что закрыто PR #5–#7, открытый техдолг, грабли Vercel preview).

## Команды

```bash
npm run dev                                    # dev-сервер (localhost:3000)
npm run build                                  # scripts/vercel-build.sh: prisma generate + next build
npx prisma migrate dev                         # локальные миграции (build локально их НЕ применяет)
npm run test:unit                              # vitest, юнит-тесты (tests/unit/)
npx playwright test --project=chromium         # E2E локально (webServer поднимется сам)
BASE_URL=https://kb-smartprocess.vercel.app npx playwright test   # E2E на прод (1 worker, sequential)
npm run test:cleanup                           # ОБЯЗАТЕЛЬНО после прогона — чистит тестовые данные
```

## Карта

- `src/app/` — страницы (App Router: `(auth)`, `(dashboard)`, `share*`) + `api/` route handlers
- `src/lib/` — ядро: `api-auth.ts` (`authenticateRequest()` — единый вход авторизации API), `auth.ts`, `embedding.ts`/`chunking.ts` (RAG)
- `src/components/` — React-компоненты (плоский список)
- `prisma/schema.prisma` — User, ApiKey, Folder, Article(+Chunk/Link/Tag/Version/View), ShareLink, FolderShareLink, Tag, Image, Attachment, SearchQuery
- `e2e/` — Playwright POM: `pages/` (Page Objects), `fixtures/` (auth/data), `specs/` (по категориям)
- `tests/unit/` — vitest по чистой логике `src/lib/` (алиас `@/` настроен в `vitest.config.mts`)
- `mcp/` — отдельный Python MCP-агент (Docker — запускать только на DevVM, не на Mac)

## Деплой и специфика

- **Push в `main` = автодеплой на прод Vercel (~1 мин).** Не пушить без разрешения.
- Миграции Prisma применяются самим Vercel-билдом (production И preview; у preview отдельная Supabase-БД). Локально `npm run build` миграции пропускает.
- Авторизация API: только через `authenticateRequest()` из `@/lib/api-auth` (Credentials + API-ключи). При изменениях auth проверять matcher в `src/middleware.ts`.
- Для UI-элементов добавлять `data-testid` — используются в E2E.

## Грабли

- **Supabase free tier**: пул соединений исчерпывается → тесты на внешний URL идут в 1 worker (уже в `playwright.config.ts`); при "max clients reached" гонять тесты малыми группами.
- **Vercel ESLint строгий**: `react-hooks/set-state-in-effect` (setState в useEffect → useReducer/useSyncExternalStore), `react-hooks/refs` (не читать ref.current в рендере). Локальный build может пройти там, где Vercel упадёт на lint.
- ArticleEditor держит черновик в localStorage (`article-draft`) — в тестах создания статьи чистить.
- После создания данных Next.js может отдать кэш — в тестах `page.reload()` перед проверкой.

## Перед коммитом

1. `npm run build` и `npm run test:unit` → PASS
2. `npx playwright test --project=chromium` → PASS, затем `npm run test:cleanup`
3. Спросить разрешение на push (push = деплой на прод)
