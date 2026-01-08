"use client";

import { useState, useEffect, useRef } from "react";

interface Article {
  id: string;
  title: string;
  slug: string;
}

interface Props {
  query: string;
  position: { top: number; left: number };
  onSelect: (title: string) => void;
  onClose: () => void;
}

export function WikilinkAutocomplete({ query, position, onSelect, onClose }: Props) {
  const [suggestions, setSuggestions] = useState<Article[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const controller = new AbortController();

    fetch(`/api/articles/suggestions?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        setSuggestions(data);
        setSelectedIndex(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, suggestions.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex].title);
        } else if (query) {
          onSelect(query);
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [suggestions, selectedIndex, query, onSelect, onClose]);

  // Закрытие при клике вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg min-w-[200px] max-w-[300px] max-h-[200px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {loading && (
        <div className="px-3 py-2 text-sm text-muted-foreground">Поиск...</div>
      )}

      {!loading && suggestions.length === 0 && query && (
        <button
          onClick={() => onSelect(query)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
            selectedIndex === 0 ? "bg-muted" : ""
          }`}
        >
          <span className="text-primary">Создать:</span> {query}
        </button>
      )}

      {suggestions.map((s, i) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.title)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
            i === selectedIndex ? "bg-muted" : ""
          }`}
        >
          {s.title}
        </button>
      ))}

      {!loading && suggestions.length > 0 && query && (
        <button
          onClick={() => onSelect(query)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted border-t border-border ${
            selectedIndex === suggestions.length ? "bg-muted" : ""
          }`}
        >
          <span className="text-primary">Создать:</span> {query}
        </button>
      )}
    </div>
  );
}
