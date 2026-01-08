"use client";

import { useState, useEffect } from "react";

interface Version {
  id: string;
  version: number;
  title: string;
  content: string;
  status: string;
  changeType: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
}

interface Props {
  articleId: string;
  articleSlug: string;
  onClose: () => void;
}

export function VersionHistoryModal({ articleId, articleSlug, onClose }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<Version | null>(null);

  useEffect(() => {
    async function fetchVersions() {
      try {
        const res = await fetch(`/api/articles/${articleId}/versions`);
        if (res.ok) {
          const data = await res.json();
          setVersions(data);
        }
      } catch (error) {
        console.error("Failed to fetch versions:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchVersions();
  }, [articleId]);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getChangeTypeLabel(type: string) {
    switch (type) {
      case "CREATE":
        return "Создание";
      case "UPDATE":
        return "Обновление";
      case "PUBLISH":
        return "Публикация";
      default:
        return type;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">История изменений</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              История изменений пуста
            </div>
          ) : selectedVersion ? (
            <div>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-sm text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Назад к списку
              </button>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-foreground">
                    Версия {selectedVersion.version}: {selectedVersion.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedVersion.createdAt)} • {selectedVersion.author.name || selectedVersion.author.email}
                  </p>
                </div>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="whitespace-pre-wrap text-sm text-foreground">
                    {selectedVersion.content}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-border cursor-pointer transition-colors"
                  onClick={() => setSelectedVersion(version)}
                >
                  <div>
                    <div className="font-medium text-foreground">
                      Версия {version.version}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(version.createdAt)} • {version.author.name || version.author.email}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-card rounded text-muted-foreground">
                    {getChangeTypeLabel(version.changeType)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
