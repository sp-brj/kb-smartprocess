"use client";

import { useState, useEffect } from "react";

interface DashboardStats {
  content: {
    totalArticles: number;
    publishedArticles: number;
    draftArticles: number;
    totalFolders: number;
    totalTags: number;
    totalUsers: number;
    totalImages: number;
    totalShareLinks: number;
  };
  engagement: {
    totalViews: number;
    totalSearches: number;
    viewsToday: number;
    searchesToday: number;
  };
}

interface Props {
  detailed?: boolean;
}

export function ContentStats({ detailed }: Props) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const contentItems = [
    {
      label: "Всего статей",
      value: stats.content.totalArticles,
      color: "text-foreground",
    },
    {
      label: "Опубликовано",
      value: stats.content.publishedArticles,
      color: "text-green-600",
    },
    {
      label: "Черновики",
      value: stats.content.draftArticles,
      color: "text-yellow-600",
    },
    { label: "Папок", value: stats.content.totalFolders, color: "text-blue-600" },
    { label: "Тегов", value: stats.content.totalTags, color: "text-purple-600" },
  ];

  const engagementItems = [
    {
      label: "Всего просмотров",
      value: stats.engagement.totalViews,
      color: "text-foreground",
    },
    {
      label: "Просмотров сегодня",
      value: stats.engagement.viewsToday,
      color: "text-primary",
    },
    {
      label: "Всего поисков",
      value: stats.engagement.totalSearches,
      color: "text-foreground",
    },
    {
      label: "Поисков сегодня",
      value: stats.engagement.searchesToday,
      color: "text-primary",
    },
  ];

  const additionalItems = detailed
    ? [
        {
          label: "Пользователей",
          value: stats.content.totalUsers,
          color: "text-foreground",
        },
        {
          label: "Изображений",
          value: stats.content.totalImages,
          color: "text-foreground",
        },
        {
          label: "Публичных ссылок",
          value: stats.content.totalShareLinks,
          color: "text-foreground",
        },
      ]
    : [];

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-semibold text-foreground mb-4">
        {detailed ? "Полная статистика" : "Обзор контента"}
      </h3>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm text-muted-foreground mb-2">Контент</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {contentItems.map((item) => (
              <div key={item.label} className="bg-muted rounded p-3">
                <div className="text-muted-foreground text-xs">{item.label}</div>
                <div className={`font-semibold text-lg ${item.color}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm text-muted-foreground mb-2">Вовлечённость</h4>
          <div className="grid grid-cols-2 gap-3">
            {engagementItems.map((item) => (
              <div key={item.label} className="bg-muted rounded p-3">
                <div className="text-muted-foreground text-xs">{item.label}</div>
                <div className={`font-semibold text-lg ${item.color}`}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {additionalItems.length > 0 && (
          <div>
            <h4 className="text-sm text-muted-foreground mb-2">Дополнительно</h4>
            <div className="grid grid-cols-3 gap-3">
              {additionalItems.map((item) => (
                <div key={item.label} className="bg-muted rounded p-3">
                  <div className="text-muted-foreground text-xs">{item.label}</div>
                  <div className={`font-semibold text-lg ${item.color}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
