"use client";

import { useReducer, useEffect, useRef, useCallback, useMemo } from "react";

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

interface SuggestionsState {
  suggestions: Article[];
  loading: boolean;
  forQuery: string;
}

type SuggestionsAction =
  | { type: "CLEAR" }
  | { type: "START_LOADING"; query: string }
  | { type: "SUCCESS"; suggestions: Article[]; query: string }
  | { type: "ERROR"; query: string };

function suggestionsReducer(state: SuggestionsState, action: SuggestionsAction): SuggestionsState {
  switch (action.type) {
    case "CLEAR":
      if (!state.loading && state.suggestions.length === 0 && state.forQuery === "") {
        return state; // No change needed
      }
      return { suggestions: [], loading: false, forQuery: "" };
    case "START_LOADING":
      return { ...state, loading: true, forQuery: action.query };
    case "SUCCESS":
      return { suggestions: action.suggestions, loading: false, forQuery: action.query };
    case "ERROR":
      return { suggestions: [], loading: false, forQuery: action.query };
    default:
      return state;
  }
}

// Custom hook to fetch suggestions
function useSuggestions(query: string) {
  const [state, dispatch] = useReducer(suggestionsReducer, {
    suggestions: [],
    loading: false,
    forQuery: "",
  });

  useEffect(() => {
    if (query.length < 1) {
      dispatch({ type: "CLEAR" });
      return;
    }

    dispatch({ type: "START_LOADING", query });

    const controller = new AbortController();

    fetch(`/api/articles/suggestions?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((data) => {
        if (!controller.signal.aborted) {
          dispatch({ type: "SUCCESS", suggestions: data, query });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          dispatch({ type: "ERROR", query });
        }
      });

    return () => controller.abort();
  }, [query]);

  return state;
}

export function WikilinkAutocomplete({ query, position, onSelect, onClose }: Props) {
  const { suggestions, loading, forQuery } = useSuggestions(query);
  const ref = useRef<HTMLDivElement>(null);

  // Compute suggestions to show - only show if query matches
  const displaySuggestions = useMemo(() => {
    return query.length >= 1 && forQuery === query ? suggestions : [];
  }, [query, forQuery, suggestions]);

  // Show loading if we're fetching or query changed but fetch hasn't caught up
  const showLoading = loading || (query.length >= 1 && forQuery !== query);

  // Create a key based on suggestions length to reset selectedIndex
  const suggestionsKey = displaySuggestions.length;

  // Use reducer with key to auto-reset when suggestions change
  const [selectedIndex, dispatchSelected] = useReducer(
    (state: { index: number; key: number }, action: { type: "SET"; value: number; key: number } | { type: "INIT"; key: number }) => {
      if (action.type === "INIT" || action.key !== state.key) {
        return { index: 0, key: action.key };
      }
      return { index: action.value, key: action.key };
    },
    { index: 0, key: suggestionsKey },
    () => ({ index: 0, key: suggestionsKey })
  );

  // Get current index, reset if key changed
  const currentIndex = selectedIndex.key !== suggestionsKey ? 0 : selectedIndex.index;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      dispatchSelected({ type: "SET", value: Math.min(currentIndex + 1, displaySuggestions.length), key: suggestionsKey });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      dispatchSelected({ type: "SET", value: Math.max(currentIndex - 1, 0), key: suggestionsKey });
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      if (currentIndex < displaySuggestions.length) {
        onSelect(displaySuggestions[currentIndex].title);
      } else if (query) {
        onSelect(query);
      }
    }
  }, [displaySuggestions, currentIndex, suggestionsKey, query, onSelect, onClose]);

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
            currentIndex === 0 ? "bg-muted" : ""
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
            i === currentIndex ? "bg-muted" : ""
          }`}
        >
          {s.title}
        </button>
      ))}

      {!showLoading && displaySuggestions.length > 0 && query && (
        <button
          onClick={() => onSelect(query)}
          className={`w-full px-3 py-2 text-left text-sm hover:bg-muted border-t border-border ${
            currentIndex === displaySuggestions.length ? "bg-muted" : ""
          }`}
        >
          <span className="text-primary">Создать:</span> {query}
        </button>
      )}
    </div>
  );
}
