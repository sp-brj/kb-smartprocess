"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Article {
  id: string;
  title: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  updatedAt: string;
  author: { name: string | null; email: string };
  folder: { name: string; slug: string } | null;
}

interface ArticlesListProps {
  initialArticles: Article[];
}

export function ArticlesList({ initialArticles }: ArticlesListProps) {
  const [articles] = useState(initialArticles);
  const [draggedArticle, setDraggedArticle] = useState<Article | null>(null);
  const isDraggingRef = useRef(false);
  const router = useRouter();

  function handleDragStart(e: React.DragEvent, article: Article) {
    isDraggingRef.current = true;
    setDraggedArticle(article);
    e.dataTransfer.setData("application/json", JSON.stringify({
      type: "article",
      id: article.id,
      title: article.title,
    }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragEnd() {
    setDraggedArticle(null);
    // Reset dragging state after a short delay to allow click to be ignored
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 100);
  }

  function handleClick(e: React.MouseEvent, slug: string) {
    // Prevent navigation if we were just dragging
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    router.push(`/articles/${slug}`);
  }

  return (
    <div className="bg-white rounded-lg shadow divide-y" data-testid="articles-list">
      {articles.map((article) => (
        <div
          key={article.id}
          draggable
          onDragStart={(e) => handleDragStart(e, article)}
          onDragEnd={handleDragEnd}
          onClick={(e) => handleClick(e, article.slug)}
          className={`block p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
            draggedArticle?.id === article.id ? "opacity-50 cursor-grabbing" : ""
          }`}
          data-testid={`article-item-${article.slug}`}
        >
          <div
            className="block"
            data-testid={`article-link-${article.slug}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0 cursor-grab"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
                <div>
                  <h2 className="font-medium text-gray-900">{article.title}</h2>
                  <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                    {article.folder && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded">
                        {article.folder.name}
                      </span>
                    )}
                    <span>{article.author.name || article.author.email}</span>
                    <span>
                      {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  article.status === "PUBLISHED"
                    ? "bg-green-100 text-green-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {article.status === "PUBLISHED" ? "Опубликовано" : "Черновик"}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
