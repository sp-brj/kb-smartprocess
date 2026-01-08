"use client";

import { useState, useEffect, useRef } from "react";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface Props {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export function TagSelector({ selectedTags, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then(setAllTags);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTags = allTags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(query.toLowerCase()) &&
      !selectedTags.some((t) => t.id === tag.id)
  );

  async function handleCreateTag() {
    if (!query.trim()) return;
    setIsCreating(true);

    try {
      const res = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: query.trim() }),
      });

      if (res.ok) {
        const newTag = await res.json();
        setAllTags([...allTags, newTag]);
        onChange([...selectedTags, newTag]);
        setQuery("");
      }
    } finally {
      setIsCreating(false);
    }
  }

  function handleSelectTag(tag: Tag) {
    onChange([...selectedTags, tag]);
    setQuery("");
    setIsOpen(false);
  }

  function handleRemoveTag(tagId: string) {
    onChange(selectedTags.filter((t) => t.id !== tagId));
  }

  return (
    <div ref={ref} className="relative">
      {/* Выбранные теги */}
      <div className="flex flex-wrap gap-1 mb-1">
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
              className="hover:text-destructive"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>

      {/* Поле ввода */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsOpen(true)}
        placeholder="Добавить тег..."
        className="w-full px-3 py-1.5 border border-border rounded text-sm bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Выпадающий список */}
      {isOpen && (query || filteredTags.length > 0) && (
        <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded shadow-lg max-h-48 overflow-y-auto">
          {filteredTags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleSelectTag(tag)}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-foreground"
            >
              {tag.name}
            </button>
          ))}

          {query &&
            !filteredTags.some((t) => t.name.toLowerCase() === query.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreateTag}
                disabled={isCreating}
                className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-muted disabled:opacity-50"
              >
                {isCreating ? "Создание..." : `+ Создать тег "${query}"`}
              </button>
            )}

          {!query && filteredTags.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              Нет доступных тегов
            </div>
          )}
        </div>
      )}
    </div>
  );
}
