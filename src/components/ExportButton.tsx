"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  articleId: string;
  articleTitle: string;
}

type ExportFormat = "html" | "docx" | "pdf" | "print";

export function ExportButton({ articleId, articleTitle }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    }
  }

  function exportToPDF() {
    setIsExporting("pdf");
    // Открываем страницу для PDF в новом окне - она автоматически вызовет диалог печати
    window.open(`/api/articles/${articleId}/export/pdf`, "_blank");
    setIsExporting(null);
    setIsOpen(false);
  }

  function printArticle() {
    setIsExporting("print");
    // Открываем страницу для печати в новом окне
    window.open(`/api/articles/${articleId}/export/pdf`, "_blank");
    setIsExporting(null);
    setIsOpen(false);
  }

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-border transition-colors"
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
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Экспорт
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-50">
          <div className="py-1">
            {/* Печать */}
            <button
              onClick={printArticle}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {isExporting === "print" ? "..." : "Печать"}
            </button>

            <div className="border-t border-border my-1"></div>

            {/* HTML */}
            <button
              onClick={exportToHTML}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm-1 15.5v-2h2v2h-2zm0-3.5V9h2v5h-2z"/>
              </svg>
              {isExporting === "html" ? "Экспорт..." : "HTML"}
            </button>

            {/* Word */}
            <button
              onClick={exportToWord}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z"/>
              </svg>
              {isExporting === "docx" ? "Экспорт..." : "Word (.docx)"}
            </button>

            {/* PDF */}
            <button
              onClick={exportToPDF}
              disabled={isExporting !== null}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted disabled:opacity-50"
            >
              <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 2c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13zm-3 5h4v1h-4v-1zm0 2h4v1h-4v-1zm0 2h4v1h-4v-1z"/>
              </svg>
              {isExporting === "pdf" ? "Экспорт..." : "PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
