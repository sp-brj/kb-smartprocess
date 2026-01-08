"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Backlink {
  id: string;
  article: {
    id: string;
    title: string;
    slug: string;
  };
}

interface Props {
  articleId: string;
}

export function BacklinksPanel({ articleId }: Props) {
  const [backlinks, setBacklinks] = useState<Backlink[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBacklinks() {
      try {
        const res = await fetch(`/api/articles/${articleId}/backlinks`);
        if (res.ok) {
          const data = await res.json();
          setBacklinks(data);
        }
      } catch (error) {
        console.error("Failed to load backlinks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadBacklinks();
  }, [articleId]);

  if (loading) {
    return null;
  }

  if (backlinks.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
        Ссылки на эту статью ({backlinks.length})
      </button>

      {isExpanded && (
        <ul className="mt-3 space-y-2">
          {backlinks.map((link) => (
            <li key={link.id}>
              <Link
                href={`/articles/${link.article.slug}`}
                className="text-primary hover:text-accent hover:underline"
              >
                {link.article.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
