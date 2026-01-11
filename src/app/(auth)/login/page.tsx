"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Произошла ошибка. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit} data-testid="login-form">
      {registered && (
        <div className="bg-green-600/20 border border-green-500/30 text-green-500 dark:text-green-400 px-4 py-3 rounded">
          Регистрация успешна! Теперь войдите в систему.
        </div>
      )}

      {error && (
        <div className="bg-destructive/20 border border-destructive/30 text-destructive px-4 py-3 rounded" data-testid="login-error">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="email@example.com"
            data-testid="login-email"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full px-3 py-2 border border-border rounded-md shadow-sm bg-background text-foreground focus:outline-none focus:ring-primary focus:border-primary"
            placeholder="Ваш пароль"
            data-testid="login-password"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="login-submit"
      >
        {loading ? "Вход..." : "Войти"}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        Для получения доступа обратитесь к администратору
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-foreground">
            Вход
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            База знаний Smart Process
          </p>
        </div>

        <Suspense fallback={<div className="text-center text-muted-foreground">Загрузка...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
