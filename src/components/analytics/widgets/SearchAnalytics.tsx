"use client";

import { useState, useEffect, useCallback } from "react";

interface SearchData {
  popularQueries: Array<{
    query: string;
    count: number;
    avgResults: number;
  }>;
  failedQueries: Array<{
    query: string;
    count: number;
  }>;
  stats: {
    totalSearches: number;
    searchesWithClick: number;
    ctr: string;
  };
}

interface Props {
  period: string;
}

export function SearchAnalytics({ period }: Props) {
  const [data, setData] = useState<SearchData | null>(null);
  const [loading, setLoading] = useState(true);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/search?days=${days}`);
      const json = await res.json();
      if (!json.error) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-48 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Общая статистика поиска */}
      <div className="bg-card rounded-lg p-6 border border-border">
        <h3 className="font-semibold text-foreground mb-4">Статистика поиска</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-muted rounded p-3">
            <div className="text-muted-foreground text-xs">Всего поисков</div>
            <div className="font-semibold text-lg">{data.stats.totalSearches}</div>
          </div>
          <div className="bg-muted rounded p-3">
            <div className="text-muted-foreground text-xs">С кликом</div>
            <div className="font-semibold text-lg text-green-600">
              {data.stats.searchesWithClick}
            </div>
          </div>
          <div className="bg-muted rounded p-3">
            <div className="text-muted-foreground text-xs">CTR</div>
            <div className="font-semibold text-lg text-primary">
              {data.stats.ctr}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Популярные запросы */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">Популярные запросы</h3>

          {data.popularQueries.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              Нет данных
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {data.popularQueries.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
                >
                  <span className="text-muted-foreground text-sm w-6">
                    {index + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate">
                      &quot;{item.query}&quot;
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ~{item.avgResults} результатов
                    </div>
                  </div>
                  <span className="text-sm font-medium">{item.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Неудачные запросы */}
        <div className="bg-card rounded-lg p-6 border border-border">
          <h3 className="font-semibold text-foreground mb-4">
            Запросы без результатов
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Это может указывать на пробелы в базе знаний
          </p>

          {data.failedQueries.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-4">
              Все поиски успешны 🎉
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {data.failedQueries.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2 rounded bg-destructive/5 hover:bg-destructive/10 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-destructive truncate">
                      &quot;{item.query}&quot;
                    </div>
                  </div>
                  <span className="text-sm font-medium text-destructive">
                    {item.count}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
