"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface Props {
  folderId?: string;
}

export function ImportButton({ folderId }: Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    slug?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (folderId) {
        formData.append("folderId", folderId);
      }

      const res = await fetch("/api/import/markdown", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResult({
          success: true,
          message: `Статья "${data.article.title}" успешно импортирована`,
          slug: data.article.slug,
        });
        router.refresh();
      } else {
        setResult({
          success: false,
          message: data.error || "Ошибка импорта",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Ошибка сети",
      });
    } finally {
      setIsImporting(false);
      // Сбрасываем input для повторного выбора того же файла
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        onChange={handleFileChange}
        className="hidden"
        id="import-file"
      />
      <label
        htmlFor="import-file"
        className={`inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg cursor-pointer transition-colors ${
          isImporting
            ? "opacity-50 cursor-not-allowed"
            : "hover:bg-purple-700"
        }`}
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
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        {isImporting ? "Импортирую..." : "Импорт .md"}
      </label>

      {result && (
        <div
          className={`absolute top-full mt-2 left-0 right-0 p-3 rounded-lg text-sm ${
            result.success
              ? "bg-green-600/20 text-green-500 dark:text-green-400 border border-green-500/30"
              : "bg-destructive/20 text-destructive border border-destructive/30"
          }`}
        >
          <p>{result.message}</p>
          {result.slug && (
            <a
              href={`/articles/${result.slug}`}
              className="text-primary hover:underline mt-1 block"
            >
              Открыть статью →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
