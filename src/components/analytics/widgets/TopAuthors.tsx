"use client";

import { useState, useEffect, useCallback } from "react";

interface Author {
  author: {
    id: string;
    name: string | null;
    email: string;
  };
  edits: number;
}

interface Props {
  period: string;
}

export function TopAuthors({ period }: Props) {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/activity?days=${days}`);
      const json = await res.json();
      if (!json.error && json.topAuthors) {
        setAuthors(json.topAuthors);
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
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-semibold text-foreground mb-4">Топ авторов</h3>

      {authors.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-4">
          Нет данных об активности
        </div>
      ) : (
        <div className="space-y-2">
          {authors.map((item, index) => (
            <div
              key={item.author?.id || index}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground text-sm w-6">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-foreground truncate">
                  {item.author?.name || item.author?.email || "Неизвестно"}
                </div>
              </div>
              <span className="text-sm font-medium text-primary">
                {item.edits} правок
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
