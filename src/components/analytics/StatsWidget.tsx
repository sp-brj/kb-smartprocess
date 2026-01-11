"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface DashboardStats {
  content: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    totalFolders: number;
    totalTags: number;
  };
  engagement: {
    totalViews: number;
    viewsToday: number;
  };
}

export function StatsWidget() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/analytics/dashboard")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setStats(data);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-3 border-t border-border">
        <div className="text-sm text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="px-4 py-3 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>Статистика</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-muted rounded p-2">
              <div className="text-muted-foreground text-xs">Статьи</div>
              <div className="font-semibold">{stats.content.totalArticles}</div>
            </div>
            <div className="bg-muted rounded p-2">
              <div className="text-muted-foreground text-xs">Просмотры</div>
              <div className="font-semibold">{stats.engagement.totalViews}</div>
            </div>
            <div className="bg-muted rounded p-2">
              <div className="text-muted-foreground text-xs">Опубликовано</div>
              <div className="font-semibold text-green-600">
                {stats.content.publishedArticles}
              </div>
            </div>
            <div className="bg-muted rounded p-2">
              <div className="text-muted-foreground text-xs">Сегодня</div>
              <div className="font-semibold text-primary">
                {stats.engagement.viewsToday}
              </div>
            </div>
          </div>

          <Link
            href="/analytics"
            className="block text-center text-xs text-primary hover:underline mt-2"
          >
            Подробная аналитика →
          </Link>
        </div>
      )}
    </div>
  );
}
