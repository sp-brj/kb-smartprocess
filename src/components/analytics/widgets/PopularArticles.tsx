"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface PopularArticle {
  article: {
    id: string;
    title: string;
    slug: string;
    status: string;
    author: { name: string | null };
    folder: { name: string } | null;
  };
  views: number;
}

interface Props {
  period: string;
}

export function PopularArticles({ period }: Props) {
  const [data, setData] = useState<PopularArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/articles/popular?period=${period}&limit=10`);
      const json = await res.json();
      if (!json.error && json.popular) {
        setData(json.popular);
      }
    } finally {
      setLoading(false);
    }
  }, [period]);

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
      <h3 className="font-semibold text-foreground mb-4">Популярные статьи</h3>

      {data.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-4">
          Нет данных о просмотрах
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((item, index) => (
            <div
              key={item.article.id}
              className="flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors"
            >
              <span className="text-muted-foreground text-sm w-6">
                {index + 1}.
              </span>
              <div className="flex-1 min-w-0">
                <Link
                  href={`/articles/${item.article.slug}`}
                  className="text-sm text-foreground hover:text-primary truncate block"
                >
                  {item.article.title}
                </Link>
                {item.article.folder && (
                  <span className="text-xs text-muted-foreground">
                    {item.article.folder.name}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-primary">
                {item.views}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
