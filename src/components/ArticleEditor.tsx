"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { WikilinkAutocomplete } from "./WikilinkAutocomplete";
import { TagSelector } from "./TagSelector";

interface Folder {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface Article {
  id: string;
  title: string;
  content: string;
  slug: string;
  status: "DRAFT" | "PUBLISHED";
  folderId: string | null;
  tags?: Tag[];
}

interface Props {
  article?: Article;
}

interface AutocompleteState {
  isOpen: boolean;
  query: string;
  position: { top: number; left: number };
  startIndex: number;
}

export function ArticleEditor({ article }: Props) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState(article?.title || "");
  const [content, setContent] = useState(article?.content || "");
  const [folderId, setFolderId] = useState(article?.folderId || "");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED">(
    article?.status || "DRAFT"
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>(article?.tags || []);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);

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

  // Получаем позицию курсора в textarea
  const getCaretCoordinates = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return { top: 0, left: 0 };

    const rect = textarea.getBoundingClientRect();
    // Примерная позиция (можно улучшить с canvas измерением)
    const lineHeight = 20;
    const lines = content.slice(0, textarea.selectionStart).split("\n");
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length;

    return {
      top: rect.top + currentLine * lineHeight + window.scrollY,
      left: rect.left + Math.min(currentCol * 8, rect.width - 200),
    };
  }, [content]);

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);

    const cursorPos = e.target.selectionStart;
    const textBefore = value.slice(0, cursorPos);
    const lastOpenBracket = textBefore.lastIndexOf("[[");
    const lastCloseBracket = textBefore.lastIndexOf("]]");

    if (lastOpenBracket > lastCloseBracket && lastOpenBracket !== -1) {
      const query = textBefore.slice(lastOpenBracket + 2);
      // Не показываем autocomplete если есть перенос строки в query
      if (!query.includes("\n")) {
        setAutocomplete({
          isOpen: true,
          query,
          position: getCaretCoordinates(),
          startIndex: lastOpenBracket,
        });
        return;
      }
    }

    setAutocomplete(null);
  }

  function handleSelectSuggestion(title: string) {
    if (!autocomplete || !textareaRef.current) return;

    const before = content.slice(0, autocomplete.startIndex);
    const cursorPos = textareaRef.current.selectionStart;
    const after = content.slice(cursorPos);
    const newContent = `${before}[[${title}]]${after}`;
    setContent(newContent);
    setAutocomplete(null);

    // Восстановить фокус
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = before.length + title.length + 4; // [[ + title + ]]
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  }

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

        // Сохраняем теги
        if (selectedTags.length > 0) {
          await fetch(`/api/articles/${data.id}/tags`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tagIds: selectedTags.map((t) => t.id) }),
          });
        }

        localStorage.removeItem("article-draft");
        router.push(`/articles/${data.slug}`);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="article-editor-form">
      {/* Title */}
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Заголовок статьи"
        className="w-full px-4 py-3 text-2xl font-bold border-0 border-b border-border bg-transparent text-foreground focus:outline-none focus:border-primary"
        required
        data-testid="article-title-input"
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="px-3 py-2 border border-border rounded text-sm bg-card text-foreground"
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
            className="px-3 py-2 border border-border rounded text-sm bg-card text-foreground"
          >
            <option value="DRAFT">Черновик</option>
            <option value="PUBLISHED">Опубликовать</option>
          </select>

          <div className="flex-1 min-w-[200px]">
            <TagSelector
              selectedTags={selectedTags}
              onChange={setSelectedTags}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-2 text-sm rounded ${
              showPreview
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {showPreview ? "Редактор" : "Превью"}
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="min-h-[400px] relative">
        {showPreview ? (
          <div className="prose prose-gray dark:prose-invert max-w-none p-4 bg-muted rounded min-h-[400px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "*Начните писать...*"}
            </ReactMarkdown>
          </div>
        ) : (
          <>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              placeholder="Содержимое статьи (поддерживается Markdown). Используйте [[название]] для ссылок на другие статьи."
              className="w-full h-[400px] px-4 py-3 border border-border rounded font-mono text-sm resize-y bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              data-testid="article-content-input"
            />
            {autocomplete?.isOpen && (
              <WikilinkAutocomplete
                query={autocomplete.query}
                position={autocomplete.position}
                onSelect={handleSelectSuggestion}
                onClose={() => setAutocomplete(null)}
              />
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-muted-foreground hover:text-foreground"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
          data-testid="article-submit-btn"
        >
          {saving ? "Сохранение..." : article ? "Сохранить" : "Создать"}
        </button>
      </div>
    </form>
  );
}
