"use client";

import { useState, useEffect, useCallback } from "react";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

type NewKeyResponse = ApiKey & { key: string };

export default function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"]);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/api-keys");
      if (!res.ok) throw new Error("Ошибка загрузки");
      const data = await res.json();
      setKeys(data);
    } catch {
      setError("Не удалось загрузить ключи");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  const createKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          permissions: newKeyPermissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания");
      }

      const data: NewKeyResponse = await res.json();
      setShowNewKey(data.key);
      setNewKeyName("");
      setNewKeyPermissions(["read"]);
      loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка создания ключа");
    } finally {
      setCreating(false);
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!res.ok) throw new Error("Ошибка обновления");
      loadKeys();
    } catch {
      setError("Не удалось обновить ключ");
    }
  };

  const deleteKey = async (id: string, name: string) => {
    if (!confirm(`Удалить ключ "${name}"?`)) return;

    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Ошибка удаления");
      loadKeys();
    } catch {
      setError("Не удалось удалить ключ");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const togglePermission = (perm: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  if (loading) {
    return <div className="p-4 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">
            Закрыть
          </button>
        </div>
      )}

      {/* Новый ключ показывается только один раз */}
      {showNewKey && (
        <div className="p-4 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
          <p className="font-medium text-green-800 dark:text-green-200 mb-2">
            Ключ создан! Скопируйте его сейчас — он больше не будет показан.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 p-2 bg-white dark:bg-gray-800 rounded font-mono text-sm break-all">
              {showNewKey}
            </code>
            <button
              onClick={() => copyToClipboard(showNewKey)}
              className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Копировать
            </button>
          </div>
          <button
            onClick={() => setShowNewKey(null)}
            className="mt-2 text-sm text-green-700 dark:text-green-300 underline"
          >
            Готово, я скопировал
          </button>
        </div>
      )}

      {/* Форма создания */}
      <form onSubmit={createKey} className="p-4 bg-card border border-border rounded-lg">
        <h3 className="font-medium mb-3">Создать новый ключ</h3>
        <div className="space-y-3">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Название (например: Clawdbot)"
            className="w-full p-2 border border-border rounded bg-background"
            required
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newKeyPermissions.includes("read")}
                onChange={() => togglePermission("read")}
                className="rounded"
              />
              <span>read</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newKeyPermissions.includes("write")}
                onChange={() => togglePermission("write")}
                className="rounded"
              />
              <span>write</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newKeyPermissions.includes("admin")}
                onChange={() => togglePermission("admin")}
                className="rounded"
              />
              <span>admin</span>
            </label>
          </div>
          <button
            type="submit"
            disabled={creating || !newKeyName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Создание..." : "Создать ключ"}
          </button>
        </div>
      </form>

      {/* Список ключей */}
      <div className="space-y-3">
        <h3 className="font-medium">Ваши API ключи ({keys.length})</h3>
        {keys.length === 0 ? (
          <p className="text-muted-foreground">Нет созданных ключей</p>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className={`p-4 border rounded-lg ${
                  key.isActive
                    ? "bg-card border-border"
                    : "bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {key.name}
                      {!key.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                          Отключен
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">
                        {key.keyPrefix}...
                      </code>
                      <span className="mx-2">|</span>
                      {key.permissions.join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Создан: {new Date(key.createdAt).toLocaleDateString("ru")}
                      {key.lastUsedAt && (
                        <>
                          <span className="mx-2">|</span>
                          Использован: {new Date(key.lastUsedAt).toLocaleDateString("ru")}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => toggleActive(key.id, key.isActive)}
                      className={`px-3 py-1 text-sm rounded ${
                        key.isActive
                          ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                      }`}
                    >
                      {key.isActive ? "Отключить" : "Включить"}
                    </button>
                    <button
                      onClick={() => deleteKey(key.id, key.name)}
                      className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Инструкция */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm">
        <h4 className="font-medium mb-2">Использование</h4>
        <pre className="bg-white dark:bg-gray-800 p-2 rounded overflow-x-auto">
{`curl -H "Authorization: Bearer kb_xxx..." \\
  https://kb.smartprocess.ru/api/articles`}
        </pre>
      </div>
    </div>
  );
}
