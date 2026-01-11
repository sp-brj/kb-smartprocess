"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface QualityData {
  issues: {
    articlesWithoutTags: {
      count: number;
      items: Array<{ id: string; title: string; slug: string }>;
    };
    articlesWithoutFolder: {
      count: number;
      items: Array<{ id: string; title: string; slug: string }>;
    };
    orphanArticles: {
      count: number;
      items: Array<{ id: string; title: string; slug: string }>;
    };
    brokenLinks: {
      count: number;
      items: Array<{
        targetTitle: string;
        source: { title: string; slug: string };
      }>;
    };
    staleArticles: {
      count: number;
      items: Array<{ id: string; title: string; slug: string; updatedAt: string }>;
    };
    shortArticles: {
      count: number;
      items: Array<{ id: string; title: string; slug: string }>;
    };
  };
  summary: { totalIssues: number };
}

interface Props {
  detailed?: boolean;
}

const issueTypes = [
  { key: "articlesWithoutTags", label: "Без тегов", icon: "🏷️", color: "text-yellow-600" },
  { key: "articlesWithoutFolder", label: "Без папки", icon: "📁", color: "text-orange-600" },
  { key: "orphanArticles", label: "Сироты", icon: "🔗", color: "text-red-600" },
  { key: "brokenLinks", label: "Битые ссылки", icon: "💔", color: "text-red-600" },
  { key: "staleArticles", label: "Устаревшие", icon: "📅", color: "text-gray-600" },
  { key: "shortArticles", label: "Короткие", icon: "📝", color: "text-blue-600" },
] as const;

export function QualityIssues({ detailed }: Props) {
  const [data, setData] = useState<QualityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/analytics/articles/quality")
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          setData(data);
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

  if (!data) return null;

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-foreground">Качество контента</h3>
        {data.summary.totalIssues > 0 && (
          <span className="bg-destructive/10 text-destructive text-xs px-2 py-1 rounded-full">
            {data.summary.totalIssues} проблем
          </span>
        )}
      </div>

      <div className="space-y-2">
        {issueTypes.map((issue) => {
          const issueData = data.issues[issue.key as keyof typeof data.issues];
          const count = issueData.count;
          const isExpanded = expandedSection === issue.key;

          return (
            <div key={issue.key}>
              <button
                onClick={() => setExpandedSection(isExpanded ? null : issue.key)}
                className={`w-full flex items-center justify-between p-2 rounded hover:bg-muted transition-colors ${
                  count > 0 ? issue.color : "text-muted-foreground"
                }`}
                disabled={count === 0}
              >
                <span className="flex items-center gap-2">
                  <span>{issue.icon}</span>
                  <span className="text-sm">{issue.label}</span>
                </span>
                <span
                  className={`text-sm font-medium ${count > 0 ? "" : "opacity-50"}`}
                >
                  {count}
                </span>
              </button>

              {isExpanded && count > 0 && detailed && (
                <div className="ml-8 mt-1 space-y-1 max-h-40 overflow-y-auto">
                  {"items" in issueData &&
                    issueData.items.slice(0, 10).map((item, i) => {
                      const slug =
                        "slug" in item
                          ? item.slug
                          : "source" in item
                            ? (item as { source: { slug: string } }).source.slug
                            : null;
                      const title =
                        "title" in item
                          ? item.title
                          : "targetTitle" in item
                            ? (item as { targetTitle: string }).targetTitle
                            : "Неизвестно";

                      return (
                        <Link
                          key={i}
                          href={slug ? `/articles/${slug}` : "#"}
                          className="block text-sm text-muted-foreground hover:text-primary truncate"
                        >
                          {title}
                        </Link>
                      );
                    })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {data.summary.totalIssues === 0 && (
        <div className="text-center text-muted-foreground text-sm py-4">
          Проблем не обнаружено 🎉
        </div>
      )}
    </div>
  );
}
