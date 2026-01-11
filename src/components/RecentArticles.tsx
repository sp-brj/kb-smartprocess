"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface RecentArticle {
  id: string;
  title: string;
  slug: string;
  updatedAt: string;
}

export function RecentArticles() {
  const [articles, setArticles] = useState<RecentArticle[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchRecent() {
      const res = await fetch("/api/articles/recent");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setArticles(data);
      }
    }
    fetchRecent();
    return () => { cancelled = true; };
  }, []);

  if (articles.length === 0) return null;

  return (
    <div className="px-4 py-3 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <span>Недавние</span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <nav className="mt-2 space-y-1">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/articles/${article.slug}`}
              className="block px-2 py-1.5 text-sm text-foreground hover:bg-muted rounded truncate"
              title={article.title}
            >
              {article.title}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
