"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Tag {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  _count: { articles: number };
}

export function TagCloud() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => {
        setTags(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-4">
        <div className="text-sm text-muted-foreground">Загрузка тегов...</div>
      </div>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  // Фильтруем теги с хотя бы одной статьей
  const tagsWithArticles = tags.filter((t) => t._count.articles > 0);

  if (tagsWithArticles.length === 0) {
    return null;
  }

  const maxCount = Math.max(...tagsWithArticles.map((t) => t._count.articles), 1);

  return (
    <div className="p-4 border-t border-border">
      <h3 className="font-semibold text-foreground mb-3 text-sm">Теги</h3>
      <div className="flex flex-wrap gap-2">
        {tagsWithArticles.map((tag) => {
          const weight = tag._count.articles / maxCount;
          const opacity = 0.6 + weight * 0.4;

          return (
            <Link
              key={tag.id}
              href={`/tags/${tag.slug}`}
              className="tag-badge hover:opacity-80 transition-opacity"
              style={{ opacity }}
            >
              {tag.name}
              <span className="text-muted-foreground ml-1">{tag._count.articles}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
