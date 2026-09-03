"use client";

import { useState } from "react";
import { useEscapeKey } from "@/lib/use-escape-key";

/**
 * Управление публичными ссылками — общая реализация для статей и папок.
 *
 * Раньше ShareButton и FolderShareButton были почти дословными копиями (~300
 * строк дублей): отличались только эндпоинтами, префиксом публичного адреса и
 * текстами. Расхождение уже успело накопиться — в папочной версии, например,
 * терялась ошибка создания ссылки.
 */

interface ShareLink {
  id: string;
  token: string;
  isActive: boolean;
  expiresAt: string | null;
  hasPassword: boolean;
  createdAt: string;
}

export type ShareKind = "article" | "folder";

interface ShareKindConfig {
  /** Эндпоинт списка/создания ссылок для владельца (статьи или папки) */
  linksPath: (ownerId: string) => string;
  /** Эндпоинт отзыва конкретной ссылки */
  revokePath: (token: string) => string;
  /** Публичный адрес ссылки */
  publicPath: (token: string) => string;
  modalTitle: string;
  emptyText: string;
  footerText: string;
}

const KINDS: Record<ShareKind, ShareKindConfig> = {
  article: {
    linksPath: (id) => `/api/articles/${id}/share`,
    revokePath: (token) => `/api/share/${token}`,
    publicPath: (token) => `/share/${token}`,
    modalTitle: "Публичная ссылка",
    emptyText: "Нет активных ссылок. Создайте ссылку, чтобы поделиться статьёй.",
    footerText:
      "Любой, у кого есть ссылка, сможет просматривать эту статью без входа в систему.",
  },
  folder: {
    linksPath: (id) => `/api/folders/${id}/share`,
    revokePath: (token) => `/api/share-folder/${token}`,
    publicPath: (token) => `/share-folder/${token}`,
    modalTitle: "Публичная ссылка на папку",
    emptyText: "Нет активных ссылок. Создайте ссылку, чтобы поделиться папкой.",
    footerText:
      "Любой, у кого есть ссылка, сможет просматривать опубликованные статьи этой папки без входа в систему.",
  },
};

const EXPIRATION_OPTIONS = [
  { value: 0, label: "Бессрочно" },
  { value: 1, label: "1 день" },
  { value: 7, label: "7 дней" },
  { value: 30, label: "30 дней" },
  { value: 90, label: "90 дней" },
];

interface Props {
  kind: ShareKind;
  /** ID статьи или папки, для которой создаются ссылки */
  ownerId: string;
}

export function ShareLinkManager({ kind, ownerId }: Props) {
  const config = KINDS[kind];

  const [isOpen, setIsOpen] = useState(false);
  useEscapeKey(isOpen, () => setIsOpen(false));
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expiresInDays, setExpiresInDays] = useState(0);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadLinks() {
    const res = await fetch(config.linksPath(ownerId));
    if (res.ok) {
      setLinks(await res.json());
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
    setError(null);
    const body: { expiresInDays?: number; password?: string } = {};
    if (expiresInDays > 0) body.expiresInDays = expiresInDays;
    if (password) body.password = password;

    const res = await fetch(config.linksPath(ownerId), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: Object.keys(body).length > 0 ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      await loadLinks();
      setExpiresInDays(0);
      setPassword("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Ошибка создания ссылки");
    }
    setIsLoading(false);
  }

  async function revokeLink(token: string) {
    setIsLoading(true);
    setError(null);
    const res = await fetch(config.revokePath(token), { method: "DELETE" });
    if (res.ok) {
      await loadLinks();
    } else {
      setError(
        res.status === 403
          ? "Отозвать ссылку может только тот, кто её создал, или администратор"
          : "Не удалось отозвать ссылку"
      );
    }
    setIsLoading(false);
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}${config.publicPath(token)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeLinks = links.filter((l) => l.isActive);

  const expirationSelect = (className: string) => (
    <select
      value={expiresInDays}
      onChange={(e) => setExpiresInDays(Number(e.target.value))}
      data-testid="share-expiration"
      className={className}
    >
      {EXPIRATION_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  const passwordInput = (className: string, placeholder: string) => (
    <input
      type="password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder={placeholder}
      data-testid="share-password"
      className={className}
    />
  );

  return (
    <>
      <button
        onClick={openModal}
        data-testid="share-button"
        className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4"
            data-testid="share-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">{config.modalTitle}</h3>
              <button
                onClick={() => setIsOpen(false)}
                data-testid="share-modal-close"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              {error && (
                <div
                  className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg"
                  data-testid="share-error"
                >
                  {error}
                </div>
              )}
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">Загрузка...</div>
              ) : activeLinks.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">{config.emptyText}</p>
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-center gap-2">
                      <label className="text-sm text-muted-foreground">Срок действия:</label>
                      {expirationSelect(
                        "px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <label className="text-sm text-muted-foreground">Пароль:</label>
                      {passwordInput(
                        "px-3 py-1.5 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-32",
                        "Необязательно"
                      )}
                    </div>
                  </div>
                  <button
                    onClick={createLink}
                    data-testid="share-create"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent"
                  >
                    Создать ссылку
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeLinks.map((link) => {
                    const isExpired = link.expiresAt
                      ? new Date(link.expiresAt) < new Date()
                      : false;
                    return (
                      <div
                        key={link.id}
                        data-testid="share-link-row"
                        className={`p-3 bg-muted rounded-lg ${isExpired ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            readOnly
                            data-testid="share-link-url"
                            value={`${
                              typeof window !== "undefined" ? window.location.origin : ""
                            }${config.publicPath(link.token)}`}
                            className="flex-1 text-sm bg-transparent border-none focus:outline-none text-muted-foreground"
                          />
                          <button
                            onClick={() => copyLink(link.token)}
                            data-testid="share-copy"
                            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-accent"
                            disabled={isExpired}
                          >
                            {copied ? "Скопировано!" : "Копировать"}
                          </button>
                          <button
                            onClick={() => revokeLink(link.token)}
                            data-testid="share-revoke"
                            className="px-3 py-1 text-sm text-destructive hover:text-destructive/80"
                            title="Отозвать ссылку"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-3">
                          {isExpired ? (
                            <span className="text-destructive">Срок действия истёк</span>
                          ) : link.expiresAt ? (
                            <span>
                              Действует до:{" "}
                              {new Date(link.expiresAt).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                          ) : (
                            <span>Бессрочная ссылка</span>
                          )}
                          {link.hasPassword && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                  fillRule="evenodd"
                                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Защищено паролем
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-border space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground">Срок:</label>
                      {expirationSelect(
                        "px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                      )}
                      <label className="text-sm text-muted-foreground ml-2">Пароль:</label>
                      {passwordInput(
                        "px-2 py-1 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary w-20",
                        "Нет"
                      )}
                    </div>
                    <button
                      onClick={createLink}
                      data-testid="share-create"
                      className="w-full px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg"
                    >
                      + Создать ещё одну ссылку
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-muted rounded-b-lg">
              <p className="text-xs text-muted-foreground">{config.footerText}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
