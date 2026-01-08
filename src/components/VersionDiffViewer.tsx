"use client";

import { useState, useEffect } from "react";

interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface DiffData {
  version: {
    id: string;
    version: number;
    title: string;
    content: string;
    createdAt: string;
    author: { name: string | null; email: string };
  };
  compareVersion: {
    id: string;
    version: number;
    title: string;
  } | null;
  diff: {
    title: { changed: boolean; old: string | null; new: string };
    content: DiffPart[];
  };
}

interface Props {
  articleId: string;
  versionId: string;
  onRevert: () => void;
  reverting: boolean;
}

export function VersionDiffViewer({
  articleId,
  versionId,
  onRevert,
  reverting,
}: Props) {
  const [data, setData] = useState<DiffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"diff" | "full">("diff");

  useEffect(() => {
    async function loadDiff() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/articles/${articleId}/versions/${versionId}/diff`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Failed to load diff:", error);
      } finally {
        setLoading(false);
      }
    }
    loadDiff();
  }, [articleId, versionId]);

  if (loading) {
    return (
      <div className="text-center text-muted-foreground py-8">Загрузка...</div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-destructive py-8">Ошибка загрузки</div>
    );
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("diff")}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === "diff"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Изменения
          </button>
          <button
            onClick={() => setViewMode("full")}
            className={`px-3 py-1 text-sm rounded ${
              viewMode === "full"
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            }`}
          >
            Полный текст
          </button>
        </div>

        {data.version.version > 1 && (
          <button
            onClick={onRevert}
            disabled={reverting}
            className="px-4 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 disabled:opacity-50 transition-colors"
            data-testid="revert-btn"
          >
            {reverting ? "Откат..." : "Откатить к этой версии"}
          </button>
        )}
      </div>

      {/* Version info */}
      <div className="mb-4 p-3 bg-muted rounded text-sm">
        <div className="flex items-center justify-between">
          <span className="font-medium text-foreground">
            Версия {data.version.version}
          </span>
          <span className="text-muted-foreground">
            {new Date(data.version.createdAt).toLocaleString("ru-RU")}
          </span>
        </div>
        <div className="text-muted-foreground">
          Автор: {data.version.author.name || data.version.author.email}
        </div>
      </div>

      {/* Title diff */}
      {data.diff.title.changed && (
        <div className="mb-4 p-3 bg-muted rounded">
          <div className="text-sm text-muted-foreground mb-1">
            Заголовок изменен:
          </div>
          {data.diff.title.old && (
            <div className="line-through text-destructive">
              {data.diff.title.old}
            </div>
          )}
          <div className="text-green-600">{data.diff.title.new}</div>
        </div>
      )}

      {/* Content diff */}
      <div className="font-mono text-sm border border-border rounded p-4 bg-muted/50 overflow-x-auto max-h-[400px] overflow-y-auto">
        {viewMode === "diff" ? (
          <pre className="whitespace-pre-wrap">
            {data.diff.content.map((part, i) => (
              <span
                key={i}
                className={
                  part.added
                    ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : part.removed
                    ? "bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-400"
                    : ""
                }
              >
                {part.value}
              </span>
            ))}
          </pre>
        ) : (
          <pre className="whitespace-pre-wrap text-foreground">
            {data.version.content}
          </pre>
        )}
      </div>

      {/* Compare info */}
      {data.compareVersion && (
        <div className="mt-4 text-sm text-muted-foreground">
          Сравнение версии {data.version.version} с версией{" "}
          {data.compareVersion.version}
        </div>
      )}
      {!data.compareVersion && data.version.version === 1 && (
        <div className="mt-4 text-sm text-muted-foreground">
          Это первая версия статьи
        </div>
      )}
    </div>
  );
}
