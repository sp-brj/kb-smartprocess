"""MCP-сервер для базы знаний kb.smartprocess.ru"""

import os
import sys
import asyncio
import httpx
from mcp.server.fastmcp import FastMCP

KB_URL = os.environ.get("KB_URL", "https://kb.smartprocess.ru").rstrip("/")
KB_API_KEY = os.environ["KB_API_KEY"]
KB_KEY_PREFIX = KB_API_KEY[:8]

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


async def _get(path: str, params: dict | None = None):
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.get(f"{KB_URL}{path}", headers=_headers(), params=params)
        r.raise_for_status()
        return r.json()


async def _post(path: str, json: dict) -> dict:
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.post(f"{KB_URL}{path}", headers=_headers(), json=json)
        r.raise_for_status()
        return r.json()


async def _patch(path: str, json: dict) -> dict:
    async with httpx.AsyncClient(verify=False, timeout=30) as c:
        r = await c.patch(f"{KB_URL}{path}", headers=_headers(), json=json)
        r.raise_for_status()
        return r.json()


@mcp.tool()
async def whoami() -> dict:
    """Информация о текущем подключении к KB: какой ключ, URL, доступен ли API.

    Полноценного «whoami» по API-ключу в KB нет (профиль работает только через сессию),
    так что вместо этого возвращается prefix ключа и результат живой проверки /api/folders.
    """
    status = "unknown"
    detail = None
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as c:
            r = await c.get(f"{KB_URL}/api/folders", headers=_headers())
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
        async with httpx.AsyncClient(verify=False, timeout=10) as c:
            r = await c.get(f"{KB_URL}/api/folders", headers=_headers())
    except Exception as e:
        print(f"[kb-mcp] STARTUP CHECK FAILED: cannot reach {KB_URL}: {e}", file=sys.stderr)
        sys.exit(1)
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
    print(f"[kb-mcp] startup OK: {KB_URL} reachable, key {KB_KEY_PREFIX}*** authorised.", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(_startup_check())
    mcp.run(transport="streamable-http")
