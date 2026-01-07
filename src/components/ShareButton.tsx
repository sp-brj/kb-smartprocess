"use client";

import { useState } from "react";

interface ShareLink {
  id: string;
  token: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface Props {
  articleId: string;
}

export function ShareButton({ articleId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadLinks() {
    const res = await fetch(`/api/articles/${articleId}/share`);
    if (res.ok) {
      const data = await res.json();
      setLinks(data);
    }
  }

  async function openModal() {
    setIsOpen(true);
    setIsLoading(true);
    await loadLinks();
    setIsLoading(false);
  }

  async function createLink() {
    setIsLoading(true);
    const res = await fetch(`/api/articles/${articleId}/share`, {
      method: "POST",
    });
    if (res.ok) {
      await loadLinks();
    }
    setIsLoading(false);
  }

  async function revokeLink(token: string) {
    setIsLoading(true);
    const res = await fetch(`/api/share/${token}`, {
      method: "DELETE",
    });
    if (res.ok) {
      await loadLinks();
    }
    setIsLoading(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/share/${token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeLinks = links.filter((l) => l.isActive);

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
          />
        </svg>
        Поделиться
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Публичная ссылка</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-4 text-gray-500">
                  Загрузка...
                </div>
              ) : activeLinks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-500 mb-4">
                    Нет активных ссылок. Создайте ссылку, чтобы поделиться
                    статьёй.
                  </p>
                  <button
                    onClick={createLink}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Создать ссылку
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLinks.map((link) => (
                    <div
                      key={link.id}
                      className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                    >
                      <input
                        type="text"
                        readOnly
                        value={`${
                          typeof window !== "undefined"
                            ? window.location.origin
                            : ""
                        }/share/${link.token}`}
                        className="flex-1 text-sm bg-transparent border-none focus:outline-none text-gray-600"
                      />
                      <button
                        onClick={() => copyLink(link.token)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        {copied ? "Скопировано!" : "Копировать"}
                      </button>
                      <button
                        onClick={() => revokeLink(link.token)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-700"
                        title="Отозвать ссылку"
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
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={createLink}
                    className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    + Создать ещё одну ссылку
                  </button>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-gray-50 rounded-b-lg">
              <p className="text-xs text-gray-500">
                Любой, у кого есть ссылка, сможет просматривать эту статью без
                входа в систему.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
