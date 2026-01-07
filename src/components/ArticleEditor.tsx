"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Folder {
  id: string;
  name: string;
}

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  folderId: string | null;
}

interface Props {
  article?: Article;
}

export function ArticleEditor({ article }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [folderId, setFolderId] = useState(article?.folderId || "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    article?.status || "DRAFT"
  );
  const [folders, setFolders] = useState<Folder[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then(setFolders);
  }, []);

  // Autosave to localStorage
  useEffect(() => {
    if (!article) {
      const draft = { title, content, folderId };
      localStorage.setItem("article-draft", JSON.stringify(draft));
    }
  }, [title, content, folderId, article]);

  // Load draft on mount
  useEffect(() => {
    if (!article) {
      const saved = localStorage.getItem("article-draft");
      if (saved) {
        const draft = JSON.parse(saved);
        setTitle(draft.title || "");
        setContent(draft.content || "");
        setFolderId(draft.folderId || "");
      }
    }
  }, [article]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const url = article ? `/api/articles/${article.id}` : "/api/articles";
      const method = article ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          folderId: folderId || null,
          status,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.removeItem("article-draft");
        router.push(`/articles/${data.slug}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок статьи"
        className="w-full px-4 py-3 text-2xl font-bold border-0 border-b focus:outline-none focus:border-blue-500"
        required
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="">Без папки</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "DRAFT" | "PUBLISHED")}
            className="px-3 py-2 border rounded text-sm"
          >
            <option value="DRAFT">Черновик</option>
            <option value="PUBLISHED">Опубликовать</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-2 text-sm rounded ${
              showPreview ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
            }`}
          >
            {showPreview ? "Редактор" : "Превью"}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="min-h-[400px]">
        {showPreview ? (
          <div className="prose prose-gray max-w-none p-4 bg-gray-50 rounded min-h-[400px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "*Начните писать...*"}
            </ReactMarkdown>
          </div>
        ) : (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Содержимое статьи (поддерживается Markdown)"
            className="w-full h-[400px] px-4 py-3 border rounded font-mono text-sm resize-y focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Сохранение..." : article ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}
