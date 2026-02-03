"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setName(data.name || "");
        }
      } catch {
        console.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Ошибка сохранения" });
        return;
      }

      setProfile((prev) => (prev ? { ...prev, name: data.name } : null));
      setMessage({ type: "success", text: "Имя успешно обновлено" });

      // Update session to reflect new name
      await updateSession({ name: data.name });
    } catch {
      setMessage({ type: "error", text: "Ошибка при сохранении" });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Пароли не совпадают" });
      setSaving(false);
      return;
    }

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error || "Ошибка смены пароля" });
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage({ type: "success", text: "Пароль успешно изменён" });
    } catch {
      setMessage({ type: "error", text: "Ошибка при смене пароля" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Администратор",
    EDITOR: "Редактор",
    READER: "Читатель",
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Профиль</h2>
        <p className="text-sm text-muted-foreground">
          Управление информацией вашего аккаунта
        </p>
      </div>

      {message && (
        <div
          className={`px-4 py-3 rounded-md text-sm ${
            message.type === "success"
              ? "bg-green-500/10 text-green-500 border border-green-500/20"
              : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Account info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Информация аккаунта</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Email</label>
            <p className="text-foreground">{profile?.email}</p>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Роль</label>
            <p className="text-foreground">{roleLabels[profile?.role || ""] || profile?.role}</p>
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Дата регистрации
            </label>
            <p className="text-foreground">
              {profile?.createdAt
                ? new Date(profile.createdAt).toLocaleDateString("ru-RU", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <hr className="border-border" />

      {/* Name form */}
      <form onSubmit={handleSaveName} className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Имя</h3>
        <div className="max-w-md">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите ваше имя"
            className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            data-testid="profile-name-input"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Имя отображается в интерфейсе и авторстве статей
          </p>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-accent disabled:opacity-50"
          data-testid="save-name-btn"
        >
          {saving ? "Сохранение..." : "Сохранить имя"}
        </button>
      </form>

      <hr className="border-border" />

      {/* Password form */}
      <form onSubmit={handleChangePassword} className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Смена пароля</h3>
        <div className="max-w-md space-y-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Текущий пароль
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="current-password-input"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Новый пароль
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={6}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="new-password-input"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Подтвердите пароль
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              data-testid="confirm-password-input"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving || !currentPassword || !newPassword}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-accent disabled:opacity-50"
          data-testid="change-password-btn"
        >
          {saving ? "Сохранение..." : "Сменить пароль"}
        </button>
      </form>
    </div>
  );
}
