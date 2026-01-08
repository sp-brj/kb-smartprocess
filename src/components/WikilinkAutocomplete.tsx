"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

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

// Custom hook to fetch suggestions
function useSuggestions(query: string) {
  const [state, setState] = useState<{
    suggestions: Article[];
    loading: boolean;
    forQuery: string;
  }>({
    suggestions: [],
    loading: false,
    forQuery: "",
  });

  useEffect(() => {
    if (query.length < 1) {
      // Only update if we have a different state
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clearing state on empty query is intentional
      setState(prev =>
        prev.loading || prev.suggestions.length > 0 || prev.forQuery !== ""
          ? { suggestions: [], loading: false, forQuery: "" }
          : prev
      );
      return;
    }

    // Set loading state
    // eslint-disable-next-line react-hooks/set-state-in-effect -- setting loading before async fetch is standard pattern
    setState(prev => ({ ...prev, loading: true, forQuery: query }));

    const controller = new AbortController();

    fetch(`/api/articles/suggestions?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- async callback from fetch
          setState({ suggestions: data, loading: false, forQuery: query });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- async callback from fetch
          setState({ suggestions: [], loading: false, forQuery: query });
        }
      });

    return () => controller.abort();
  }, [query]);

  return state;
}

export function WikilinkAutocomplete({ query, position, onSelect, onClose }: Props) {
  const { suggestions, loading, forQuery } = useSuggestions(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  // Compute suggestions to show - only show if query matches
  const displaySuggestions = useMemo(() => {
    return query.length >= 1 && forQuery === query ? suggestions : [];
  }, [query, forQuery, suggestions]);

  // Show loading if we're fetching or query changed but fetch hasn't caught up
  const showLoading = loading || (query.length >= 1 && forQuery !== query);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, displaySuggestions.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (selectedIndex < displaySuggestions.length) {
        onSelect(displaySuggestions[selectedIndex].title);
      } else if (query) {
        onSelect(query);
      }
    }
  }, [displaySuggestions, selectedIndex, query, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Reset selected index when displaySuggestions changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting index on suggestions change is intentional
    setSelectedIndex(0);
  }, [displaySuggestions.length]);

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-card border border-border rounded-lg shadow-lg min-w-[200px] max-w-[300px] max-h-[200px] overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {showLoading && (
        <div className="px-3 py-2 text-sm text-muted-foreground">Поиск...</div>
      )}

      {!showLoading && displaySuggestions.length === 0 && query && (
        <button
          onClick={() => onSelect(query)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted ${
            selectedIndex === 0 ? "bg-muted" : ""
          }`}
        >
          <span className="text-primary">Создать:</span> {query}
        </button>
      )}

      {displaySuggestions.map((s, i) => (
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

      {!showLoading && displaySuggestions.length > 0 && query && (
        <button
          onClick={() => onSelect(query)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted border-t border-border ${
            selectedIndex === displaySuggestions.length ? "bg-muted" : ""
          }`}
        >
          <span className="text-primary">Создать:</span> {query}
        </button>
      )}
    </div>
  );
}
