# kb-mcp — MCP-сервер для kb.smartprocess.ru

Тонкая обёртка над публичным REST API KB, поднимаемая как MCP-сервер для Claude Code / Cursor / любого другого MCP-клиента.

Живёт **здесь же, в репо `sp-kb`**, чтобы при изменении API-эндпоинтов на стороне Next.js обёртка правилась тем же PR. Деплоится отдельно — на DevVM в `docker-compose`.

## Что умеет

| Tool                  | Что делает                                                  |
|-----------------------|-------------------------------------------------------------|
| `whoami`              | Prefix ключа + живой health-check `/api/folders`            |
| `list_folders`        | Папки KB (рекурсивно)                                       |
| `list_articles`       | Статьи + фильтры: `folder_id`, `status`, `author_email`, `tag`, `limit` |
| `get_article`         | Статья по `id` или `slug`                                   |
| `create_article`      | Создать (Markdown)                                          |
| `update_article`      | Обновить (title / content / folder / status)                |
| `search_articles`     | Полнотекстовый поиск + те же фильтры + `limit`              |
| `list_tags`           | Все теги                                                    |
| `add_tags_to_article` | Прикрепить теги к статье                                    |
| `archive_article`     | Soft-delete: `DRAFT` + тег `archived`. Хард-delete — нет.   |

Все методы, возвращающие статью, добавляют поле `url` = `KB_URL + /articles/{slug}`.

## Запуск (DevVM)

```bash
cd /home/devops/kb-mcp
cp .env.example .env
chmod 600 .env
# вписать KB_API_KEY (создать в UI KB → Профиль → API Keys, права read+write)
docker compose up -d --build
docker logs kb-mcp --tail 20
```

Успешный старт:
```
[kb-mcp] startup OK: https://kb.smartprocess.ru reachable, key kb_xxxxx*** authorised.
```

Если ключ битый — контейнер падает с `STARTUP CHECK FAILED` и **не поднимается**. Это намеренно: лучше шумно упасть, чем тихо отдавать 401 на каждый tool-call.

## Подключение к Claude Code

Стандартный MCP-конфиг (через nginx/cloudflare):
```json
{
  "kb": {
    "type": "streamable-http",
    "url": "https://kb-mcp.smartprocess.ru/mcp"
  }
}
```

## Безопасность

- `KB_API_KEY` **никогда** не коммитим — только в `.env` (chmod 600), `.env` в `.gitignore`
- Отдельный ключ под MCP (не личный) — чтобы можно было отозвать без последствий
- `archive_article` — soft only; хард-`DELETE` намеренно не выставляется в MCP (LLM может удалить лишнего)

## Локальная разработка

```bash
python -m venv .venv && source .venv/bin/activate
pip install mcp[cli] httpx
export KB_URL=https://kb.smartprocess.ru
export KB_API_KEY=kb_...
python main.py
```

## Зависимость от API sp-kb

| MCP-метод                   | Эндпоинт sp-kb                       |
|-----------------------------|--------------------------------------|
| `list_folders`              | `GET /api/folders`                   |
| `list_articles`             | `GET /api/articles`                  |
| `get_article`               | `GET /api/articles/{id}`             |
| `create_article`            | `POST /api/articles`                 |
| `update_article` / `archive`| `PATCH /api/articles/{id}`           |
| `search_articles`           | `GET /api/search?q=...`              |
| `list_tags`                 | `GET /api/tags`                      |
| `add_tags_to_article`       | `POST /api/articles/{id}/tags`       |

Меняешь эндпоинт в `src/app/api/...` → проверь обёртку здесь.
