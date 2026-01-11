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

  // Функция форматирования текста
  function insertFormatting(prefix: string, suffix: string = prefix, placeholder: string = "") {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const textToInsert = selectedText || placeholder;

    const before = content.slice(0, start);
    const after = content.slice(end);
    const newContent = `${before}${prefix}${textToInsert}${suffix}${after}`;

    setContent(newContent);

    // Восстановить фокус и выделение
    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        // Если был выделен текст, ставим курсор после
        const newPos = start + prefix.length + textToInsert.length + suffix.length;
        textarea.setSelectionRange(newPos, newPos);
      } else {
        // Если текста не было, выделяем placeholder
        const selectStart = start + prefix.length;
        const selectEnd = selectStart + textToInsert.length;
        textarea.setSelectionRange(selectStart, selectEnd);
      }
    }, 0);
  }

  // Функция для вставки в начало строки (заголовки, списки)
  function insertLinePrefix(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Находим начало текущей строки
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    const lineEnd = content.indexOf("\n", end);
    const actualLineEnd = lineEnd === -1 ? content.length : lineEnd;

    const before = content.slice(0, lineStart);
    const line = content.slice(lineStart, actualLineEnd);
    const after = content.slice(actualLineEnd);

    const newContent = `${before}${prefix}${line}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newPos = lineStart + prefix.length + line.length;
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  }

  // Функция для вставки блока кода
  function insertCodeBlock() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);

    const before = content.slice(0, start);
    const after = content.slice(end);

    const codeBlock = selectedText
      ? `\`\`\`\n${selectedText}\n\`\`\``
      : "```\nкод\n```";

    const newContent = `${before}${codeBlock}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      if (!selectedText) {
        const selectStart = start + 4; // после ```\n
        const selectEnd = selectStart + 3; // "код"
        textarea.setSelectionRange(selectStart, selectEnd);
      }
    }, 0);
  }

  // Обработка горячих клавиш
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case "b":
          e.preventDefault();
          insertFormatting("**", "**", "жирный");
          break;
        case "i":
          e.preventDefault();
          insertFormatting("*", "*", "курсив");
          break;
        case "k":
          e.preventDefault();
          insertFormatting("[", "](url)", "текст ссылки");
          break;
      }
    }
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
          <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded min-h-[400px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content || "*Начните писать...*"}
            </ReactMarkdown>
          </div>
        ) : (
          <>
            {/* Панель форматирования */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-muted border border-border rounded-t border-b-0">
              {/* Жирный */}
              <button
                type="button"
                onClick={() => insertFormatting("**", "**", "жирный")}
                className="p-2 hover:bg-card rounded text-foreground font-bold"
                title="Жирный (Ctrl+B)"
              >
                B
              </button>
              {/* Курсив */}
              <button
                type="button"
                onClick={() => insertFormatting("*", "*", "курсив")}
                className="p-2 hover:bg-card rounded text-foreground italic"
                title="Курсив (Ctrl+I)"
              >
                I
              </button>
              {/* Зачёркнутый */}
              <button
                type="button"
                onClick={() => insertFormatting("~~", "~~", "зачёркнутый")}
                className="p-2 hover:bg-card rounded text-foreground line-through"
                title="Зачёркнутый"
              >
                S
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Заголовки */}
              <button
                type="button"
                onClick={() => insertLinePrefix("# ")}
                className="p-2 hover:bg-card rounded text-foreground text-sm font-bold"
                title="Заголовок 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix("## ")}
                className="p-2 hover:bg-card rounded text-foreground text-sm font-bold"
                title="Заголовок 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix("### ")}
                className="p-2 hover:bg-card rounded text-foreground text-sm font-bold"
                title="Заголовок 3"
              >
                H3
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Списки */}
              <button
                type="button"
                onClick={() => insertLinePrefix("- ")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Маркированный список"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix("1. ")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Нумерованный список"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix("> ")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Цитата"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Код */}
              <button
                type="button"
                onClick={() => insertFormatting("`", "`", "код")}
                className="p-2 hover:bg-card rounded text-foreground font-mono text-sm"
                title="Инлайн код"
              >
                {"<>"}
              </button>
              <button
                type="button"
                onClick={insertCodeBlock}
                className="p-2 hover:bg-card rounded text-foreground font-mono text-sm"
                title="Блок кода"
              >
                {"{ }"}
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Ссылка */}
              <button
                type="button"
                onClick={() => insertFormatting("[", "](url)", "текст ссылки")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Ссылка"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </button>
              {/* Wiki-ссылка */}
              <button
                type="button"
                onClick={() => insertFormatting("[[", "]]", "название статьи")}
                className="p-2 hover:bg-card rounded text-primary font-bold text-sm"
                title="Wiki-ссылка на статью"
              >
                [[]]
              </button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Горизонтальная линия */}
              <button
                type="button"
                onClick={() => insertFormatting("\n---\n", "", "")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Горизонтальная линия"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
            </div>

            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              placeholder="Содержимое статьи (поддерживается Markdown). Используйте [[название]] для ссылок на другие статьи."
              className="w-full h-[400px] px-4 py-3 border border-border rounded-t-none rounded-b font-mono text-sm resize-y bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
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
