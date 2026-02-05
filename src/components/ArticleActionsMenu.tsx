"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { VersionHistoryModal } from "./VersionHistoryModal";

interface Props {
  articleId: string;
  articleSlug: string;
  articleTitle: string;
}

type ExportFormat = "html" | "docx" | "pdf" | "print";

export function ArticleActionsMenu({
  articleId,
  articleSlug,
  articleTitle,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Закрытие по клику вне меню
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsExportOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setIsExportOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  async function handleDelete() {
    if (!confirm("Удалить статью? Это действие нельзя отменить.")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/articles/${articleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/articles");
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  // Экспорт функции
  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function sanitizeFilename(name: string): string {
    return name.replace(/[/\\?%*:|"<>]/g, "-").trim();
  }

  async function exportToHTML() {
    setIsExporting("html");
    try {
      const res = await fetch(`/api/articles/${articleId}/export/html`);
      if (!res.ok) throw new Error("Ошибка экспорта");
      const blob = await res.blob();
      downloadFile(blob, `${sanitizeFilename(articleTitle)}.html`);
    } catch (error) {
      console.error("Ошибка экспорта в HTML:", error);
      alert("Ошибка при экспорте в HTML");
    } finally {
      setIsExporting(null);
      setIsOpen(false);
      setIsExportOpen(false);
    }
  }

  async function exportToWord() {
    setIsExporting("docx");
    try {
      const res = await fetch(`/api/articles/${articleId}/export/docx`);
      if (!res.ok) throw new Error("Ошибка экспорта");
      const blob = await res.blob();
      downloadFile(blob, `${sanitizeFilename(articleTitle)}.docx`);
    } catch (error) {
      console.error("Ошибка экспорта в Word:", error);
      alert("Ошибка при экспорте в Word");
    } finally {
      setIsExporting(null);
      setIsOpen(false);
      setIsExportOpen(false);
    }
  }

  function exportToPDF() {
    setIsExporting("pdf");
    window.open(`/api/articles/${articleId}/export/pdf`, "_blank");
    setIsExporting(null);
    setIsOpen(false);
    setIsExportOpen(false);
  }

  function printArticle() {
    setIsExporting("print");
    window.open(`/api/articles/${articleId}/export/pdf`, "_blank");
    setIsExporting(null);
    setIsOpen(false);
    setIsExportOpen(false);
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
          title="Дополнительные действия"
          data-testid="article-actions-menu"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-52 bg-card border border-border rounded-lg shadow-lg z-50">
            {/* Экспорт - подменю */}
            <div className="relative">
              <button
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg"
              >
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Экспорт
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isExportOpen ? "rotate-90" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {isExportOpen && (
                <div className="absolute left-full top-0 ml-1 w-40 bg-card border border-border rounded-lg shadow-lg">
                  <button
                    onClick={printArticle}
                    disabled={isExporting !== null}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-t-lg disabled:opacity-50"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    {isExporting === "print" ? "..." : "Печать"}
                  </button>
                  <div className="border-t border-border" />
                  <button
                    onClick={exportToHTML}
                    disabled={isExporting !== null}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <span className="w-4 h-4 text-orange-500 font-bold text-xs">
                      {"</>"}
                    </span>
                    {isExporting === "html" ? "..." : "HTML"}
                  </button>
                  <button
                    onClick={exportToWord}
                    disabled={isExporting !== null}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <span className="w-4 h-4 text-blue-500 font-bold text-xs">
                      W
                    </span>
                    {isExporting === "docx" ? "..." : "Word"}
                  </button>
                  <button
                    onClick={exportToPDF}
                    disabled={isExporting !== null}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted rounded-b-lg disabled:opacity-50"
                  >
                    <span className="w-4 h-4 text-red-500 font-bold text-xs">
                      PDF
                    </span>
                    {isExporting === "pdf" ? "..." : "PDF"}
                  </button>
                </div>
              )}
            </div>

            {/* История */}
            <button
              onClick={() => {
                setIsHistoryOpen(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted"
              data-testid="menu-history"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              История изменений
            </button>

            <div className="border-t border-border my-1" />

            {/* Удалить */}
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-b-lg disabled:opacity-50"
              data-testid="menu-delete"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              {isDeleting ? "Удаление..." : "Удалить статью"}
            </button>
          </div>
        )}
      </div>

      {/* Модалка истории */}
      {isHistoryOpen && (
        <VersionHistoryModal
          articleId={articleId}
          articleSlug={articleSlug}
          onClose={() => setIsHistoryOpen(false)}
          onRevert={() => router.refresh()}
        />
      )}
    </>
  );
}
