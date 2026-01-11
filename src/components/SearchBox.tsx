"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface SearchResult {
  id: string;
  title: string;
  slug: string;
  snippet: string;
  folder: { name: string; slug: string } | null;
}

function getSessionId() {
  let sessionId = sessionStorage.getItem("analytics_session");
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem("analytics_session", sessionId);
  }
  return sessionId;
}

export function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTrackedQuery = useRef<string>("");
  const router = useRouter();

  // Трекинг поискового запроса
  const trackSearch = useCallback((searchQuery: string, resultsCount: number, clickedArticleId?: string) => {
    if (searchQuery.trim().length < 2) return;

    fetch("/api/analytics/track/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: searchQuery,
        resultsCount,
        sessionId: getSessionId(),
        clickedArticleId,
      }),
    }).catch(() => {
      // Игнорируем ошибки трекинга
    });
  }, []);

  // Трекинг клика по результату
  const handleResultClick = useCallback((articleId: string) => {
    trackSearch(query, results.length, articleId);
    setIsOpen(false);
  }, [query, results.length, trackSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.articles);
          setIsOpen(true);

          // Трекинг поиска (только если запрос изменился)
          if (query !== lastTrackedQuery.current) {
            lastTrackedQuery.current = query;
            trackSearch(query, data.articles.length);
          }
        }
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [query, trackSearch]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
    if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Поиск..."
          className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          data-testid="search-input"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto" data-testid="search-results">
          {results.map((result) => (
            <Link
              key={result.id}
              href={`/articles/${result.slug}`}
              onClick={() => handleResultClick(result.id)}
              className="block p-3 hover:bg-muted border-b border-border last:border-b-0"
              data-testid={`search-result-${result.slug}`}
            >
              <div className="font-medium text-foreground">{result.title}</div>
              {result.folder && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {result.folder.name}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {result.snippet}
              </div>
            </Link>
          ))}
          <Link
            href={`/search?q=${encodeURIComponent(query)}`}
            onClick={() => setIsOpen(false)}
            className="block p-3 text-center text-sm text-primary hover:bg-primary/10 border-t border-border"
          >
            Показать все результаты →
          </Link>
        </div>
      )}

      {isOpen && query.trim().length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 p-4 text-center text-muted-foreground" data-testid="search-no-results">
          Ничего не найдено
        </div>
      )}
    </div>
  );
}
