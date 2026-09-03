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


async def _put(path: str, json: dict) -> dict:
    return await _request("PUT", path, json=json)


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
    """Дерево папок базы знаний: корневые папки с вложенными children (до 3 уровней).

    tree=1 — только корни; без него API отдаёт плоский список, где каждая
    подпапка приходила дважды (и как корень, и внутри родителя).
    """
    return await _get("/api/folders", {"tree": "1"})


@mcp.tool()
async def list_articles(
    folder_id: str | None = None,
    status: str | None = None,
    author_email: str | None = None,
    tag: str | None = None,
    limit: int | None = None,
) -> list:
    """Список статей (без тела; тело — get_article). Сортировка: updatedAt desc.

    Все фильтры применяются на сервере. Раньше tag/author_email фильтровались
    на стороне MCP поверх первой страницы (100 статей) и молча теряли остальное.

    Args:
        folder_id: ID папки (если задан — только статьи в этой папке)
        status: DRAFT / PUBLISHED
        author_email: email автора
        tag: имя или slug тега
        limit: максимум результатов (по умолчанию 100, максимум 500)
    """
    params = {}
    if folder_id:
        params["folderId"] = folder_id
    if status:
        params["status"] = status
    if author_email:
        params["author"] = author_email
    if tag:
        params["tag"] = tag
    if limit and limit > 0:
        params["limit"] = limit
    return _enrich_list(await _get("/api/articles", params))


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
    """Обновить существующую статью.

    Передавать только то, что меняется. folder_id="" — убрать статью из папки
    (в корень); content="" — очистить текст. None (не передано) = не трогать.
    """
    data = {}
    if title is not None:
        data["title"] = title
    if content is not None:
        data["content"] = content
    if folder_id is not None:
        data["folderId"] = folder_id or None
    if status is not None:
        data["status"] = status
    if not data:
        raise RuntimeError("update_article: нечего обновлять — не передано ни одного поля")
    return _enrich_article(await _patch(f"/api/articles/{article_id}", data))


@mcp.tool()
async def search_articles(
    query: str,
    author_email: str | None = None,
    tag: str | None = None,
    status: str | None = None,
    limit: int | None = None,
) -> list:
    """Полнотекстовый поиск по заголовку и тексту (ILIKE), фильтры на сервере.

    Args:
        query: поисковая фраза (минимум 2 символа)
        author_email: email автора
        tag: имя или slug тега
        status: DRAFT / PUBLISHED
        limit: максимум результатов (по умолчанию 20, максимум 100)
    """
    params = {"q": query}
    if author_email:
        params["author"] = author_email
    if tag:
        params["tag"] = tag
    if status:
        params["status"] = status
    if limit and limit > 0:
        params["limit"] = limit
    resp = await _get("/api/search", params)
    items = resp.get("articles", []) if isinstance(resp, dict) else resp
    return _enrich_list(items)


@mcp.tool()
async def list_tags() -> list:
    """Список всех тегов базы знаний."""
    return await _get("/api/tags")


async def _add_tags(article_id: str, tag_ids: list[str]) -> list:
    # POST /tags принимает один tagId за раз, поэтому добавление — через PUT
    # (полная замена): читаем текущие теги, объединяем и записываем всё разом.
    current = await _get(f"/api/articles/{article_id}/tags")
    merged = sorted({t["id"] for t in (current or [])} | set(tag_ids))
    return await _put(f"/api/articles/{article_id}/tags", {"tagIds": merged})


@mcp.tool()
async def add_tags_to_article(article_id: str, tag_ids: list[str]) -> list:
    """Добавить теги к статье (по их ID). Существующие теги сохраняются."""
    return await _add_tags(article_id, tag_ids)


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
    await _add_tags(article_id, [tag_id])
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
