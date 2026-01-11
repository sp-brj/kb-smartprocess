"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Change {
  article: {
    title: string;
    slug: string;
  };
  author: {
    name: string | null;
    email: string;
  };
  changeType: "CREATE" | "UPDATE" | "REVERT";
  changeSummary: string | null;
  createdAt: string;
}

const changeTypeLabels = {
  CREATE: { label: "Создано", color: "text-green-600" },
  UPDATE: { label: "Обновлено", color: "text-blue-600" },
  REVERT: { label: "Откат", color: "text-orange-600" },
};

export function RecentActivity() {
  const [changes, setChanges] = useState<Change[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/activity?days=30")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error && data.recentChanges) {
          setChanges(data.recentChanges);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    return date.toLocaleDateString("ru");
  };

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-semibold text-foreground mb-4">Последняя активность</h3>

      {changes.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-4">
          Нет активности
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {changes.slice(0, 15).map((change, index) => {
            const typeInfo = changeTypeLabels[change.changeType];
            return (
              <div
                key={index}
                className="flex items-start gap-3 p-2 rounded hover:bg-muted transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(change.createdAt)}
                    </span>
                  </div>
                  <Link
                    href={`/articles/${change.article.slug}`}
                    className="text-sm text-foreground hover:text-primary truncate block"
                  >
                    {change.article.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {change.author?.name || change.author?.email}
                    {change.changeSummary && `: ${change.changeSummary}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
