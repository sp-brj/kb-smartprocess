"use client";

import { useState, ReactNode } from "react";

interface Props {
  token: string;
  type: "article" | "folder";
  children: ReactNode;
}

export function PasswordProtectedContent({ token, type, children }: Props) {
  const [password, setPassword] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const endpoint = type === "article"
      ? `/api/share/${token}/verify`
      : `/api/share-folder/${token}/verify`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setIsUnlocked(true);
    } else {
      setError("Неверный пароль");
    }
    setIsLoading(false);
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <svg
            className="w-12 h-12 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <h1 className="text-xl font-bold text-foreground mb-2">
            Защищено паролем
          </h1>
          <p className="text-sm text-muted-foreground">
            Введите пароль для доступа к {type === "article" ? "статье" : "папке"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isLoading || !password}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent disabled:opacity-50"
          >
            {isLoading ? "Проверка..." : "Открыть"}
          </button>
        </form>
      </div>
    </div>
  );
}
