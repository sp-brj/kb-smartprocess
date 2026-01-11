"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { WikilinkAutocomplete } from "./WikilinkAutocomplete";
import { TagSelector } from "./TagSelector";
import { ImageUploadButton } from "./ImageUploadButton";

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

// Цвета для выделения текста
const HIGHLIGHT_COLORS = [
  { name: "Без цвета", color: "" },
  { name: "Красный", color: "#fee2e2", textColor: "#991b1b" },
  { name: "Розовый", color: "#fce7f3", textColor: "#9d174d" },
  { name: "Оранжевый", color: "#ffedd5", textColor: "#9a3412" },
  { name: "Желтый", color: "#fef9c3", textColor: "#854d0e" },
  { name: "Зеленый", color: "#dcfce7", textColor: "#166534" },
  { name: "Бирюзовый", color: "#ccfbf1", textColor: "#115e59" },
  { name: "Синий", color: "#dbeafe", textColor: "#1e40af" },
  { name: "Фиолетовый", color: "#f3e8ff", textColor: "#6b21a8" },
  { name: "Серый", color: "#f3f4f6", textColor: "#374151" },
];

// Цвета для callout блоков
const CALLOUT_COLORS = [
  { name: "Зеленый (успех)", color: "#166534", bgColor: "#dcfce7", borderColor: "#16a34a" },
  { name: "Красный (важно)", color: "#991b1b", bgColor: "#fee2e2", borderColor: "#dc2626" },
  { name: "Желтый (внимание)", color: "#854d0e", bgColor: "#fef9c3", borderColor: "#ca8a04" },
  { name: "Синий (инфо)", color: "#1e40af", bgColor: "#dbeafe", borderColor: "#2563eb" },
  { name: "Фиолетовый (подсказка)", color: "#6b21a8", bgColor: "#f3e8ff", borderColor: "#9333ea" },
  { name: "Серый (примечание)", color: "#374151", bgColor: "#f3f4f6", borderColor: "#6b7280" },
];

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
  const [viewMode, setViewMode] = useState<"editor" | "preview" | "split">("editor");
  const [autocomplete, setAutocomplete] = useState<AutocompleteState | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [showCalloutPicker, setShowCalloutPicker] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");

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

  // Закрытие picker при клике вне
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (showHighlightPicker && !target.closest("[data-highlight-picker]")) {
        setShowHighlightPicker(false);
      }
      if (showCalloutPicker && !target.closest("[data-callout-picker]")) {
        setShowCalloutPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showHighlightPicker, showCalloutPicker]);

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

  // Функция для выделения текста цветом
  function insertHighlight(bgColor: string, textColor?: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const textToInsert = selectedText || "выделенный текст";

    const before = content.slice(0, start);
    const after = content.slice(end);

    let newContent: string;
    if (!bgColor) {
      // Убрать выделение - просто вставить текст без тегов
      newContent = `${before}${textToInsert}${after}`;
    } else {
      const style = textColor
        ? `background-color: ${bgColor}; color: ${textColor}; padding: 2px 4px; border-radius: 3px;`
        : `background-color: ${bgColor}; padding: 2px 4px; border-radius: 3px;`;
      newContent = `${before}<mark style="${style}">${textToInsert}</mark>${after}`;
    }

    setContent(newContent);
    setShowHighlightPicker(false);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  // Функция для вставки callout блока
  function insertCallout(textColor: string, bgColor: string, borderColor: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const textToInsert = selectedText || "Текст блока";

    const before = content.slice(0, start);
    const after = content.slice(end);

    const style = `background-color: ${bgColor}; color: ${textColor}; border-left: 4px solid ${borderColor}; padding: 12px 16px; border-radius: 4px; margin: 8px 0;`;
    const calloutHtml = `\n<div style="${style}">\n\n${textToInsert}\n\n</div>\n`;

    const newContent = `${before}${calloutHtml}${after}`;
    setContent(newContent);
    setShowCalloutPicker(false);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  // Функция для вставки таблицы
  function insertTable() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = content.slice(0, start);
    const after = content.slice(start);

    const tableMarkdown = `
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
| Ячейка 1    | Ячейка 2    | Ячейка 3    |
| Ячейка 4    | Ячейка 5    | Ячейка 6    |
`;

    const newContent = `${before}${tableMarkdown}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  // Функция для вставки видео (YouTube, VK, Rutube)
  function insertVideo() {
    const textarea = textareaRef.current;
    if (!textarea || !videoUrl.trim()) return;

    const url = videoUrl.trim();
    let embedHtml = "";

    // YouTube
    const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (youtubeMatch) {
      const videoId = youtubeMatch[1];
      embedHtml = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="border-radius: 8px; margin: 16px 0;"></iframe>`;
    }

    // VK Video
    const vkMatch = url.match(/vk\.com\/video(-?\d+)_(\d+)/);
    if (vkMatch) {
      const ownerId = vkMatch[1];
      const videoId = vkMatch[2];
      embedHtml = `<iframe width="100%" height="400" src="https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}" frameborder="0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen style="border-radius: 8px; margin: 16px 0;"></iframe>`;
    }

    // Rutube
    const rutubeMatch = url.match(/rutube\.ru\/video\/([a-zA-Z0-9]+)/);
    if (rutubeMatch) {
      const videoId = rutubeMatch[1];
      embedHtml = `<iframe width="100%" height="400" src="https://rutube.ru/play/embed/${videoId}" frameborder="0" allow="clipboard-write; autoplay" allowfullscreen style="border-radius: 8px; margin: 16px 0;"></iframe>`;
    }

    if (!embedHtml) {
      alert("Не удалось распознать ссылку. Поддерживаются: YouTube, VK Video, Rutube");
      return;
    }

    const start = textarea.selectionStart;
    const before = content.slice(0, start);
    const after = content.slice(start);

    const newContent = `${before}\n${embedHtml}\n${after}`;
    setContent(newContent);
    setShowVideoModal(false);
    setVideoUrl("");

    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  // Функция для вставки сворачиваемого блока
  function insertDetailsBlock() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.slice(start, end);
    const summaryText = selectedText || "Заголовок";

    const before = content.slice(0, start);
    const after = content.slice(end);

    const detailsHtml = `\n<details style="border: 1px solid var(--border); border-radius: 6px; padding: 8px 12px; margin: 8px 0;">\n<summary style="cursor: pointer; font-weight: 500;">${summaryText}</summary>\n\nСодержимое блока\n\n</details>\n`;

    const newContent = `${before}${detailsHtml}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
    }, 0);
  }

  // Загрузка файла изображения
  async function uploadImageFile(file: File, caption?: string) {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Неподдерживаемый формат. Разрешены: jpg, png, gif, webp");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Файл слишком большой. Максимум: 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (caption) formData.append("caption", caption);
      if (article?.id) formData.append("articleId", article.id);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      const markdown = caption ? `![${caption}](${data.url})` : `![](${data.url})`;
      insertImageMarkdown(markdown);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      setIsUploadingImage(false);
    }
  }

  // Обработка drag & drop
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find((f) => f.type.startsWith("image/"));
    if (imageFile) {
      uploadImageFile(imageFile);
    }
  }

  // Обработка paste
  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));

    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) {
        uploadImageFile(file);
      }
    }
  }

  // Вставка markdown изображения в текущую позицию курсора
  function insertImageMarkdown(markdown: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const before = content.slice(0, start);
    const after = content.slice(start);

    // Добавляем перенос строки если нужно
    const needsNewlineBefore = before.length > 0 && !before.endsWith("\n");
    const needsNewlineAfter = after.length > 0 && !after.startsWith("\n");

    const newContent = `${before}${needsNewlineBefore ? "\n" : ""}${markdown}${needsNewlineAfter ? "\n" : ""}${after}`;
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      const newPos = before.length + (needsNewlineBefore ? 1 : 0) + markdown.length + (needsNewlineAfter ? 1 : 0);
      textarea.setSelectionRange(newPos, newPos);
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

        <div className="flex items-center gap-1 bg-muted rounded p-1">
          <button
            type="button"
            onClick={() => setViewMode("editor")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              viewMode === "editor"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Редактор
          </button>
          <button
            type="button"
            onClick={() => setViewMode("split")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              viewMode === "split"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => setViewMode("preview")}
            className={`px-3 py-1.5 text-sm rounded transition-colors ${
              viewMode === "preview"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Превью
          </button>
        </div>
      </div>

      {/* Editor / Preview */}
      <div className="min-h-[400px] relative">
        {viewMode === "preview" ? (
          <div className="prose dark:prose-invert max-w-none p-4 bg-muted rounded min-h-[400px]">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {content || "*Начните писать...*"}
            </ReactMarkdown>
          </div>
        ) : viewMode === "split" ? (
          <div className="grid grid-cols-2 gap-4 min-h-[400px]">
            {/* Левая часть - редактор */}
            <div className="flex flex-col">
              {/* Панель форматирования для split */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-muted border border-border rounded-t border-b-0">
                <button type="button" onClick={() => insertFormatting("**", "**", "жирный")} className="p-1.5 hover:bg-card rounded text-foreground font-bold text-sm" title="Жирный">B</button>
                <button type="button" onClick={() => insertFormatting("*", "*", "курсив")} className="p-1.5 hover:bg-card rounded text-foreground italic text-sm" title="Курсив">I</button>
                <button type="button" onClick={() => insertLinePrefix("## ")} className="p-1.5 hover:bg-card rounded text-foreground text-xs font-bold" title="Заголовок">H2</button>
                <button type="button" onClick={() => insertLinePrefix("- ")} className="p-1.5 hover:bg-card rounded text-foreground" title="Список">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                </button>
                <ImageUploadButton onUpload={insertImageMarkdown} articleId={article?.id} />
              </div>
              <div
                className="relative flex-1"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onKeyDown={handleKeyDown}
                  onPaste={handlePaste}
                  placeholder="Содержимое статьи..."
                  className={`w-full h-full min-h-[400px] px-3 py-2 border border-border rounded-t-none rounded-b font-mono text-sm resize-none bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${isDragging ? "border-primary border-2 bg-primary/5" : ""}`}
                  data-testid="article-content-input"
                />
                {isDragging && (
                  <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none">
                    <div className="text-primary font-medium text-sm">Отпустите для загрузки</div>
                  </div>
                )}
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded pointer-events-none">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Загрузка...
                    </div>
                  </div>
                )}
              </div>
              {autocomplete?.isOpen && (
                <WikilinkAutocomplete
                  query={autocomplete.query}
                  position={autocomplete.position}
                  onSelect={handleSelectSuggestion}
                  onClose={() => setAutocomplete(null)}
                />
              )}
            </div>
            {/* Правая часть - превью */}
            <div className="border border-border rounded bg-muted overflow-auto">
              <div className="p-3 border-b border-border bg-card/50 text-xs text-muted-foreground font-medium">
                Превью
              </div>
              <div className="prose dark:prose-invert max-w-none p-4 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {content || "*Начните писать...*"}
                </ReactMarkdown>
              </div>
            </div>
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
              {/* Подчёркнутый */}
              <button
                type="button"
                onClick={() => insertFormatting("<u>", "</u>", "подчёркнутый")}
                className="p-2 hover:bg-card rounded text-foreground underline"
                title="Подчёркнутый"
              >
                U
              </button>
              {/* Выделение цветом */}
              <div className="relative" data-highlight-picker>
                <button
                  type="button"
                  onClick={() => setShowHighlightPicker(!showHighlightPicker)}
                  className="p-2 hover:bg-card rounded text-foreground"
                  title="Выделение цветом"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                {showHighlightPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-lg z-50 grid grid-cols-5 gap-1">
                    {HIGHLIGHT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => insertHighlight(c.color, c.textColor)}
                        className="w-6 h-6 rounded-full border border-border hover:scale-110 transition-transform flex items-center justify-center"
                        style={{ backgroundColor: c.color || "transparent" }}
                        title={c.name}
                      >
                        {!c.color && (
                          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
              {/* Чек-лист */}
              <button
                type="button"
                onClick={() => insertLinePrefix("- [ ] ")}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Чек-лист"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </button>
              {/* Callout блок */}
              <div className="relative" data-callout-picker>
                <button
                  type="button"
                  onClick={() => setShowCalloutPicker(!showCalloutPicker)}
                  className="p-2 hover:bg-card rounded text-foreground"
                  title="Цветовой блок (callout)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                {showCalloutPicker && (
                  <div className="absolute top-full left-0 mt-1 p-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
                    {CALLOUT_COLORS.map((c) => (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => insertCallout(c.color, c.bgColor, c.borderColor)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-muted rounded text-left text-sm"
                      >
                        <span
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: c.bgColor, borderColor: c.borderColor }}
                        />
                        <span className="text-foreground">{c.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {/* Сворачиваемый блок */}
              <button
                type="button"
                onClick={insertDetailsBlock}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Сворачиваемый блок"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
              {/* Таблица */}
              <button
                type="button"
                onClick={insertTable}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Таблица"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
                </svg>
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
              {/* Изображение */}
              <ImageUploadButton
                onUpload={insertImageMarkdown}
                articleId={article?.id}
              />
              {/* Видео */}
              <button
                type="button"
                onClick={() => setShowVideoModal(true)}
                className="p-2 hover:bg-card rounded text-foreground"
                title="Вставить видео (YouTube, VK, Rutube)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
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

            <div
              className="relative"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder="Содержимое статьи (поддерживается Markdown). Используйте [[название]] для ссылок на другие статьи. Перетащите изображение или вставьте из буфера (Ctrl+V)."
                className={`w-full h-[400px] px-4 py-3 border border-border rounded-t-none rounded-b font-mono text-sm resize-y bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary ${
                  isDragging ? "border-primary border-2 bg-primary/5" : ""
                }`}
                data-testid="article-content-input"
              />
              {/* Индикатор drag & drop */}
              {isDragging && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/10 border-2 border-dashed border-primary rounded pointer-events-none">
                  <div className="text-primary font-medium">
                    Отпустите для загрузки изображения
                  </div>
                </div>
              )}
              {/* Индикатор загрузки */}
              {isUploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded pointer-events-none">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Загрузка изображения...
                  </div>
                </div>
              )}
            </div>
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

      {/* Модальное окно вставки видео */}
      {showVideoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground mb-4">Вставить видео</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Поддерживаются: YouTube, VK Video, Rutube
            </p>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Вставьте ссылку на видео..."
              className="w-full px-3 py-2 border border-border rounded bg-background text-foreground mb-4 focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowVideoModal(false);
                  setVideoUrl("");
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={insertVideo}
                disabled={!videoUrl.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              >
                Вставить
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
