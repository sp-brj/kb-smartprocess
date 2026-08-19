/**
 * Разбор параметров постраничного вывода для list-эндпоинтов.
 *
 * Раньше списки отдавали всю таблицу целиком — с ростом базы это линейно
 * тяжелеет и по запросу, и по трафику. Значения по умолчанию подобраны так,
 * чтобы существующие клиенты (UI, MCP) продолжали работать без изменений.
 */

export const DEFAULT_LIMIT = 100;
export const MAX_LIMIT = 500;

export interface ListRange {
  take: number;
  skip: number;
}

export function parseListRange(
  searchParams: URLSearchParams,
  defaultLimit: number = DEFAULT_LIMIT
): ListRange {
  const rawLimit = Number(searchParams.get("limit"));
  const rawOffset = Number(searchParams.get("offset") ?? searchParams.get("skip"));

  const take =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), MAX_LIMIT)
      : defaultLimit;

  const skip =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  return { take, skip };
}
