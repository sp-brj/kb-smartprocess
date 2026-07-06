# Беклог: MCP-сервер и API для AI-агента

> Дорожная карта расширения MCP-сервера KB (`mcp/main.py`) и API сайта (`src/app/api/**`)
> под полноценную работу AI-агента с базой знаний.
> Составлено 2026-06-03 по результатам аудита текущего состояния.

## Контекст и главный вывод

MCP-сервер сейчас выставляет наружу **10 инструментов**, тогда как API сайта умеет **~40 операций**.
Большинство доработок — это **обернуть уже существующие endpoints в MCP-tools, не трогая сайт**.
На стороне сайта реально нужен по сути один новый метод — семантический поиск.

**Текущие MCP-инструменты** (`mcp/main.py`): `whoami`, `list_folders`, `list_articles`, `get_article`,
`create_article`, `update_article`, `search_articles`, `list_tags`, `add_tags_to_article`, `archive_article`.

**Аутентификация MCP → API**: Bearer-токен `KB_API_KEY` (права read/write), транспорт `streamable-http`, порт 8014, деплой — Docker на DevVM.

---

## P0 — только MCP, сайт не трогаем (endpoints уже есть)

Самый высокий ROI: разблокирует наведение порядка в KB прямо сейчас.

### Папки — полный CRUD
Мотивация: сейчас через MCP нельзя ни создать, ни перенести, ни удалить папку.
Конкретный кейс — папку «Протоколы» нельзя вытащить из временного раздела «Разобрать».

- [ ] `create_folder(name, parent_id?)` → POST `/api/folders`
- [ ] `update_folder(folder_id, name?, parent_id?)` → PATCH `/api/folders/[id]` (переименование + перемещение; API уже проверяет циклы и глубину ≤ 3)
- [ ] `delete_folder(folder_id)` → DELETE `/api/folders/[id]` (API удаляет только пустые папки)
- [ ] `get_folder(folder_id)` → GET `/api/folders/[id]` (папка + подпапки + статьи)

### Wiki-граф
- [ ] `get_backlinks(article_id)` → GET `/api/articles/[id]/backlinks` — входящие ссылки. Нужно перед слиянием/перемещением статей при консолидации методологии.

### Дешёвые геттеры
- [ ] `list_recent()` → GET `/api/articles/recent`
- [ ] `get_stats()` → GET `/api/articles/stats`

---

## P1 — только MCP (тоже без правок сайта)

### Версии статей
Мотивация: агент сейчас редактирует чужой контент «вслепую», без отката через MCP.

- [ ] `list_versions(article_id)` → GET `/api/articles/[id]/versions`
- [ ] `get_version(article_id, version_id)` → GET `/api/articles/[id]/versions/[versionId]`
- [ ] `diff_versions(article_id, version_id, compare?)` → GET `/api/articles/[id]/versions/[versionId]/diff`
- [ ] `revert_version(article_id, version_id)` → POST `/api/articles/[id]/versions/[versionId]/revert`

### Теги — нормальное управление
- [ ] `create_tag(name, color?)` → POST `/api/tags` (сейчас можно только навешивать существующие по id)
- [ ] `set_article_tags(article_id, tag_ids[])` → PUT `/api/articles/[id]/tags` (замена всего набора — так можно и СНЯТЬ тег, чего сейчас нет)

### Миграция и навигация
- [ ] `import_markdown(file, folder_id?)` → POST `/api/import/markdown` — эндпоинт уже парсит YAML-frontmatter и конвертит `[[wiki]]`. Прямой инструмент переноса методологии из Obsidian в KB.
- [ ] `suggest_links(query)` → GET `/api/articles/suggestions` — автодополнение wiki-ссылок, чтобы не плодить битые ссылки.

---

## Доработки НА САЙТЕ (Next.js, билд + деплой Vercel)

Только про поиск.

### P0 — Семантический поиск как отдельный endpoint
Сейчас векторный поиск (pgvector, эмбеддинги) заперт внутри `/api/chat` и всегда тянет генерацию ответа через OpenAI (`gpt-4o-mini`). Агенту нужны релевантные статьи без LLM-ответа.

- [ ] `POST /api/search/semantic` — принимает `query`, возвращает топ-N chunks/статей с дистанцией, **без** вызова LLM. Переиспользовать `embedText` + векторный поиск по `ArticleChunk.embedding`, вынеся их из `/api/chat/route.ts`.
- [ ] В MCP: добавить режим `mode=semantic` в `search_articles` (или отдельный `semantic_search`).

### P1 — Фильтры в `/api/search`
Сейчас `/api/search` — голый `LIKE` по title+content, **без фильтров**. Из-за этого фильтр по тегу в MCP — нерабочая заглушка (`pass` в `search_articles`).

- [ ] Добавить query-параметры `status`, `folderId`, `tag`, `author` в `/api/search/route.ts`.
- [ ] Убрать заглушку фильтра по тегу в MCP `search_articles`.

---

## P2 — технический долг MCP (не горит)

- [ ] **SSL verify** — `httpx.AsyncClient(verify=False)` в `mcp/main.py`. На проде включить проверку сертификата.
- [ ] **Пагинация** — MCP тянет весь список и режет в памяти (`items[:limit]`). Уже 47 статей в «ИНСТРУКЦИИ», 42 в «РЕШЕНИЯ» — при росте упрётся. Прокинуть `limit`/`offset` в API.
- [ ] **Retry/backoff** — один таймаут (30s) = ошибка инструмента. Добавить ретраи на идемпотентные GET.

---

## 🔴 Подтверждённые баги рантайма (аудит через MCP, 2026-06-24)

Отдельно от фич выше: это не «чего не хватает», а «что уже есть, но нестабильно». **Приоритет выше любых новых инструментов** — пока KB роняет соединения, агент не может надёжно ни читать, ни писать. «Простая, но идеально работающая» начинается отсюда.

### BUG-1 🔴 Запись роняет соединение
`create_article` дважды подряд → `socket connection closed unexpectedly` / пустая ошибка инструмента. Статья при этом НЕ создалась (проверено поиском между попытками).
- Риск: ошибка может приходить **после** коммита в БД → дубли при ретрае. Нужна идемпотентность (отклонять создание при совпадении title+folder, либо возвращать id до закрытия сокета).
- Проверить таймаут / keep-alive на `streamable-http` и на reverse-proxy (Docker на DevVM).

### BUG-2 🔴 `/api/tags` (list_tags) висит и роняет транспорт
`list_tags` → `timeout` несколько раз подряд. Эндпоинт тегов либо без индекса, либо тянет всё. Связано с P1-заглушкой фильтра по тегу. Пока теги нерабочие целиком.

### BUG-3 🔴 Падение одного запроса роняет ВСЕ параллельные
Когда `list_tags` завис, соседний параллельный `list_articles` тоже умер: `transport dropped mid-call; response was lost`. Нет изоляции и per-request timeout — один медленный эндпоинт убивает всю MCP-сессию.
- Каждый upstream-запрос — свой timeout (8–10s) + аккуратная ошибка, НЕ ронять сессию. (Перекликается с P2 retry/backoff, но корень — общий клиент / сессия.)

### BUG-4 🟡 Контент = гибрид Markdown + сырой inline-HTML
`get_article` отдаёт `content` с `<style>p{text-indent:25px}</style>`, заголовками `##` и одновременно `<p>5.2 ...</p>` вместо списков. Source of truth замусорен, правки через `update_article` болезненны, diff шумный.
- Хранить **чистый Markdown**, HTML генерить при отображении на фронте. Прогнать разовую нормализацию существующих статей.

### BUG-5 🟡 `list_folders` — смешанный вывод
Возвращает и дерево (`children`), и плоский список тех же папок отдельными объектами → дубли в выдаче («Маркировка», «РЕШЕНИЯ», «Протоколы», «ИНСТРУКЦИИ» приходят дважды). Отдавать одно дерево одним JSON.

### BUG-6 🟢 `whoami` починился
Раньше `health: error`, сейчас `health: ok`. Пункт закрыт.

> Контентная мелочь (не API): в «Шаблон статей Д/Р» пропуски в нумерации опер.расходов — есть 5.2–5.14, затем сразу 5.17 (нет 5.1, 5.15, 5.16). Поправить в самой статье.

---

## Сознательно НЕ делаем

- **Hard-delete статей в MCP** — DELETE `/api/articles/[id]` на сайте есть, но для агента опасно. Оставляем `archive_article` (soft: DRAFT + тег `archived`).
- **`move_article` отдельным методом** — не нужен, `update_article` уже принимает `folder_id`.
- **export pdf/docx/html в MCP** — агенту бесполезно.

---

## Рекомендованный порядок работ

1. **Сессия 1 (быстрая, чистый MCP):** P0 — folder CRUD + backlinks + recent/stats. Только `mcp/main.py`, деплой Docker на DevVM.
2. **Сессия 2 (сайт):** `/api/search/semantic` + фильтры в `/api/search`. Билд + деплой Vercel (production — осторожно).
3. **Сессия 3 (добивка):** P1 MCP (versions, tags, import_markdown, suggest_links) + P2 тех-долг.

## Справочные пути

| Что | Файл |
|-----|------|
| MCP-сервер | `mcp/main.py` (~269 строк), `mcp/README.md` |
| Аутентификация API | `src/lib/api-auth.ts` |
| Статьи | `src/app/api/articles/route.ts`, `src/app/api/articles/[id]/route.ts` |
| Папки (move/CRUD) | `src/app/api/folders/route.ts`, `src/app/api/folders/[id]/route.ts` |
| Поиск (LIKE) | `src/app/api/search/route.ts` |
| AI-чат (vector search) | `src/app/api/chat/route.ts` |
| Версии | `src/app/api/articles/[id]/versions/**` |
| Backlinks | `src/app/api/articles/[id]/backlinks/route.ts` |
| Модель данных | `prisma/schema.prisma` |
