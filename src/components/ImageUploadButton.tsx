"use client";

import { useState, useRef } from "react";

interface Props {
  onUpload: (markdown: string) => void;
  articleId?: string;
}

export function ImageUploadButton({ onUpload, articleId }: Props) {
  const [uploading, setUploading] = useState(false);
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File, captionText: string) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (captionText) {
        formData.append("caption", captionText);
      }
      if (articleId) {
        formData.append("articleId", articleId);
      }

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();
      const markdown = captionText
        ? `![${captionText}](${data.url})`
        : `![](${data.url})`;

      onUpload(markdown);
    } catch (error) {
      console.error("Upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload image");
    } finally {
      setUploading(false);
      setPendingFile(null);
      setCaption("");
      setShowCaptionModal(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Показываем модальное окно для ввода подписи
    setPendingFile(file);
    setShowCaptionModal(true);

    // Сбрасываем input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleConfirmUpload() {
    if (pendingFile) {
      uploadFile(pendingFile, caption);
    }
  }

  function handleCancelUpload() {
    setPendingFile(null);
    setCaption("");
    setShowCaptionModal(false);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="p-2 hover:bg-card rounded text-foreground disabled:opacity-50"
        title="Вставить изображение"
      >
        {uploading ? (
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        )}
      </button>

      {/* Модальное окно для ввода подписи */}
      {showCaptionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-semibold mb-4 text-foreground">
              Добавить изображение
            </h3>

            {pendingFile && (
              <div className="mb-4 p-2 bg-muted rounded text-sm text-muted-foreground">
                {pendingFile.name} ({(pendingFile.size / 1024).toFixed(1)} KB)
              </div>
            )}

            <label className="block text-sm font-medium mb-2 text-foreground">
              Подпись (опционально)
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Введите подпись к изображению..."
              className="w-full px-3 py-2 border border-border rounded bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmUpload();
                }
                if (e.key === "Escape") {
                  handleCancelUpload();
                }
              }}
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelUpload}
                className="px-4 py-2 text-muted-foreground hover:text-foreground"
                disabled={uploading}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={uploading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50"
              >
                {uploading ? "Загрузка..." : "Загрузить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
