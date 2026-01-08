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
  const [selectedState, dispatchSelected] = useReducer(
    (_: number, action: { type: "SET"; value: number } | { type: "RESET" }) => {
      if (action.type === "RESET") return 0;
      return action.value;
    },
    0
  );
  const ref = useRef<HTMLDivElement>(null);

  // Compute suggestions to show - only show if query matches
  const displaySuggestions = useMemo(() => {
    return query.length >= 1 && forQuery === query ? suggestions : [];
  }, [query, forQuery, suggestions]);

  // Show loading if we're fetching or query changed but fetch hasn't caught up
  const showLoading = loading || (query.length >= 1 && forQuery !== query);

  // Track previous length to reset on change
  const prevLengthRef = useRef(displaySuggestions.length);
  const selectedIndex = prevLengthRef.current !== displaySuggestions.length ? 0 : selectedState;
  prevLengthRef.current = displaySuggestions.length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      dispatchSelected({ type: "SET", value: Math.min(selectedIndex + 1, displaySuggestions.length) });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      dispatchSelected({ type: "SET", value: Math.max(selectedIndex - 1, 0) });
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
