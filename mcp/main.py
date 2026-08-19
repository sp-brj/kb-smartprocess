"""MCP-сервер для базы знаний kb.smartprocess.ru"""

import os
import sys
import asyncio
import httpx
from mcp.server.fastmcp import FastMCP

KB_URL = os.environ.get("KB_URL", "https://kb.smartprocess.ru").rstrip("/")
KB_API_KEY = os.environ["KB_API_KEY"]
KB_KEY_PREFIX = KB_API_KEY[:8]

# Проверка TLS включена. Отключать только осознанно (самоподписанный сертификат
# в dev-контуре): раньше здесь стояло verify=False во всех клиентах, что
# открывало MITM на пути к боевому KB вместе с API-ключом.
KB_TLS_VERIFY = os.environ.get("KB_TLS_VERIFY", "true").strip().lower() not in (
    "0",
    "false",
    "no",
)

CONNECT_TIMEOUT = float(os.environ.get("KB_CONNECT_TIMEOUT", "5"))
READ_TIMEOUT = float(os.environ.get("KB_READ_TIMEOUT", "30"))
MAX_RETRIES = int(os.environ.get("KB_MAX_RETRIES", "3"))
RETRY_BACKOFF = float(os.environ.get("KB_RETRY_BACKOFF", "0.5"))

# Один общий клиент на весь процесс: пул соединений вместо нового TCP+TLS
# handshake на каждый вызов инструмента (прежнее поведение и роняло транспорт
# под нагрузкой).
_client: httpx.AsyncClient | None = None

RETRIABLE_STATUS = {429, 502, 503, 504}


async def _get_client() -> httpx.AsyncClient:
    # Конструктор синхронный, точек await внутри нет — гонки между корутинами
    # здесь не возникает, блокировка не нужна (и не пережила бы смену loop'а).
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=KB_URL,
            verify=KB_TLS_VERIFY,
            timeout=httpx.Timeout(
                connect=CONNECT_TIMEOUT,
                read=READ_TIMEOUT,
                write=READ_TIMEOUT,
                pool=CONNECT_TIMEOUT,
            ),
            limits=httpx.Limits(max_connections=10, max_keepalive_connections=5),
            follow_redirects=True,
        )
    return _client


async def _aclose_client() -> None:
    global _client
    if _client is not None and not _client.is_closed:
        await _client.aclose()
    _client = None

mcp = FastMCP("kb-smartprocess", port=int(os.environ.get("MCP_PORT", "8014")), host="0.0.0.0")


def _headers():
    return {"Authorization": f"Bearer {KB_API_KEY}", "Content-Type": "application/json"}


def _article_url(slug: str | None) -> str | None:
    return f"{KB_URL}/articles/{slug}" if slug else None


def _enrich_article(a: dict) -> dict:
    if isinstance(a, dict) and "slug" in a:
        a = {**a, "url": _article_url(a.get("slug"))}
    return a


def _enrich_list(items):
    if isinstance(items, list):
        return [_enrich_article(x) for x in items]
    return items


async def _request(
    method: str,
    path: str,
    *,
    params: dict | None = None,
    json: dict | None = None,
):
    """Запрос к KB с ретраями и внятной ошибкой вместо падения транспорта.

    Повторяем только то, что безопасно повторять: GET — на сетевых сбоях и
    временных 5xx/429; POST и PATCH — исключительно на ConnectError/ConnectTimeout,
    когда запрос заведомо не дошёл до сервера (иначе можно создать дубль статьи).
    """
    client = await _get_client()
    idempotent = method.upper() == "GET"
    last_error: Exception | None = None

    for attempt in range(MAX_RETRIES):
        try:
            r = await client.request(
                method, path, headers=_headers(), params=params, json=json
            )
        except (httpx.ConnectError, httpx.ConnectTimeout) as e:
            last_error = e  # соединение не установлено — повтор безопасен всегда
        except (httpx.ReadTimeout, httpx.WriteTimeout, httpx.RemoteProtocolError) as e:
            if not idempotent:
                raise RuntimeError(
                    f"{method} {path}: обрыв связи с KB ({type(e).__name__}). "
                    "Запрос мог быть применён — повтор не выполняется, проверьте состояние вручную."
                ) from e
            last_error = e
        else:
            if r.status_code in RETRIABLE_STATUS and attempt < MAX_RETRIES - 1:
                last_error = RuntimeError(f"HTTP {r.status_code}")
            elif r.is_error:
                raise RuntimeError(
                    f"{method} {path}: KB вернул HTTP {r.status_code}: {r.text[:300]}"
                )
            else:
                return r.json() if r.content else None

        if attempt < MAX_RETRIES - 1:
            await asyncio.sleep(RETRY_BACKOFF * (2**attempt))

    raise RuntimeError(f"{method} {path}: KB недоступен после {MAX_RETRIES} попыток: {last_error}")


async def _get(path: str, params: dict | None = None):
    return await _request("GET", path, params=params)


async def _post(path: str, json: dict) -> dict:
    return await _request("POST", path, json=json)


async def _patch(path: str, json: dict) -> dict:
    return await _request("PATCH", path, json=json)


@mcp.tool()
async def whoami() -> dict:
    """Информация о текущем подключении к KB: какой ключ, URL, доступен ли API.

    Полноценного «whoami» по API-ключу в KB нет (профиль работает только через сессию),
    так что вместо этого возвращается prefix ключа и результат живой проверки /api/folders.
    """
    status = "unknown"
    detail = None
    try:
        client = await _get_client()
        r = await client.get("/api/folders", headers=_headers())
        status = "ok" if r.status_code == 200 else f"http_{r.status_code}"
        if r.status_code != 200:
            detail = r.text[:200]
    except Exception as e:
        status = "error"
        detail = str(e)[:200]
    return {
        "kb_url": KB_URL,
        "api_key_prefix": KB_KEY_PREFIX + "***",
        "health": status,
        "detail": detail,
    }


@mcp.tool()
async def list_folders() -> list:
    """Список всех папок базы знаний (рекурсивно, до 3 уровней вложенности)."""
    return await _get("/api/folders")


@mcp.tool()
async def list_articles(
    folder_id: str | None = None,
    status: str | None = None,
    author_email: str | None = None,
    tag: str | None = None,
    limit: int | None = None,
) -> list:
    """Список статей.

    Args:
        folder_id: ID папки (если задан — только статьи в этой папке)
        status: DRAFT / PUBLISHED
        author_email: фильтр по email автора (клиент-сайд)
        tag: фильтр по имени или slug тега (клиент-сайд)
        limit: ограничить количество результатов (клиент-сайд, статьи сортированы по updatedAt desc)
    """
    params = {}
    if folder_id:
        params["folderId"] = folder_id
    if status:
        params["status"] = status
    # Клиентские фильтры (author_email/tag) применяются уже после ответа, поэтому
    # сузить выборку на сервере можно только когда их нет.
    if limit and limit > 0 and not author_email and not tag:
        params["limit"] = limit
    items = await _get("/api/articles", params)

    if author_email:
        items = [a for a in items if (a.get("author") or {}).get("email") == author_email]
    if tag:
        t = tag.lower()
        items = [
            a for a in items
            if any((x.get("name", "").lower() == t or x.get("slug", "").lower() == t) for x in (a.get("tags") or []))
        ]
    if limit and limit > 0:
        items = items[:limit]
    return _enrich_list(items)


@mcp.tool()
async def get_article(article_id: str) -> dict:
    """Получить статью по ID или slug (с полным содержимым)."""
    return _enrich_article(await _get(f"/api/articles/{article_id}"))


@mcp.tool()
async def create_article(title: str, content: str, folder_id: str | None = None, status: str = "PUBLISHED") -> dict:
    """Создать статью в базе знаний.

    Args:
        title: Заголовок статьи
        content: Содержимое в Markdown
        folder_id: ID папки (опционально)
        status: DRAFT или PUBLISHED (по умолчанию PUBLISHED)
    """
    data = {"title": title, "content": content, "status": status}
    if folder_id:
        data["folderId"] = folder_id
    return _enrich_article(await _post("/api/articles", data))


@mcp.tool()
async def update_article(article_id: str, title: str | None = None, content: str | None = None,
                          folder_id: str | None = None, status: str | None = None) -> dict:
    """Обновить существующую статью."""
    data = {}
    if title:
        data["title"] = title
    if content:
        data["content"] = content
    if folder_id:
        data["folderId"] = folder_id
    if status:
        data["status"] = status
    return _enrich_article(await _patch(f"/api/articles/{article_id}", data))


@mcp.tool()
async def search_articles(
    query: str,
    author_email: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    limit: int | None = None,
) -> list:
    """Полнотекстовый поиск по базе знаний.

    Args:
        query: поисковая фраза
        author_email: фильтр по email автора (клиент-сайд)
        tag: фильтр по имени или slug тега (клиент-сайд, требует доп. запроса для тегов — пока не доступен в search API)
        status: DRAFT / PUBLISHED (клиент-сайд)
        limit: ограничить количество результатов
    """
    resp = await _get("/api/search", {"q": query})
    items = resp.get("articles", []) if isinstance(resp, dict) else resp
    if author_email:
        items = [a for a in items if (a.get("author") or {}).get("email") == author_email]
    if status:
        items = [a for a in items if a.get("status") == status]
    if tag:
        # search-эндпоинт не возвращает теги, фильтр по тегу здесь работать не будет
        # оставлено для совместимости интерфейса с list_articles
        pass
    if limit and limit > 0:
        items = items[:limit]
    return _enrich_list(items)


@mcp.tool()
async def list_tags() -> list:
    """Список всех тегов базы знаний."""
    return await _get("/api/tags")


@mcp.tool()
async def add_tags_to_article(article_id: str, tag_ids: list[str]) -> dict:
    """Добавить теги к статье (по их ID)."""
    return await _post(f"/api/articles/{article_id}/tags", {"tagIds": tag_ids})


ARCHIVE_TAG_NAME = "archived"


async def _ensure_archive_tag_id() -> str:
    tags = await _get("/api/tags")
    for t in tags:
        if t.get("name", "").lower() == ARCHIVE_TAG_NAME or t.get("slug", "").lower() == ARCHIVE_TAG_NAME:
            return t["id"]
    created = await _post("/api/tags", {"name": ARCHIVE_TAG_NAME})
    return created["id"]


@mcp.tool()
async def archive_article(article_id: str) -> dict:
    """Архивировать статью (soft delete).

    В KB нет статуса ARCHIVED, поэтому архивирование делается так:
    1) статья переводится в DRAFT (исчезает из публичной выдачи)
    2) к статье добавляется тег "archived"

    Это обратимо: убрать тег и вернуть PUBLISHED через update_article.
    Хард-delete намеренно не реализован — слишком опасно для агента.
    """
    tag_id = await _ensure_archive_tag_id()
    article = await _patch(f"/api/articles/{article_id}", {"status": "DRAFT"})
    await _post(f"/api/articles/{article_id}/tags", {"tagIds": [tag_id]})
    return {
        "archived": True,
        "article_id": article_id,
        "url": _article_url(article.get("slug")),
        "note": "Статус → DRAFT, добавлен тег archived. Хард-delete недоступен из MCP.",
    }


async def _startup_check() -> None:
    """Fail-fast: проверяем что ключ валиден, иначе не поднимаемся."""
    try:
        client = await _get_client()
        r = await client.get("/api/folders", headers=_headers())
    except Exception as e:
        print(f"[kb-mcp] STARTUP CHECK FAILED: cannot reach {KB_URL}: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        # У проверки свой event loop; клиент сервера создастся заново в loop'е mcp.run().
        await _aclose_client()
    if r.status_code in (401, 403):
        print(
            f"[kb-mcp] STARTUP CHECK FAILED: KB_API_KEY ({KB_KEY_PREFIX}***) is invalid for {KB_URL} (HTTP {r.status_code}).",
            file=sys.stderr,
        )
        print(f"[kb-mcp] body: {r.text[:200]}", file=sys.stderr)
        sys.exit(1)
    if r.status_code >= 500:
        print(
            f"[kb-mcp] STARTUP WARN: KB returned {r.status_code}, continuing anyway.",
            file=sys.stderr,
        )
        return
    print(
        f"[kb-mcp] startup OK: {KB_URL} reachable, key {KB_KEY_PREFIX}*** authorised, "
        f"tls_verify={KB_TLS_VERIFY}.",
        file=sys.stderr,
    )


if __name__ == "__main__":
    asyncio.run(_startup_check())
    try:
        mcp.run(transport="streamable-http")
    finally:
        asyncio.run(_aclose_client())
