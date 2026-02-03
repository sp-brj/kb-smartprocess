"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "EDITOR" | "READER";
  createdAt: string;
  _count: {
    articles: number;
  };
}

export default function UsersSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form state for new user
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    role: "EDITOR" as "ADMIN" | "EDITOR" | "READER",
  });
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user || session.user.role !== "ADMIN") {
      router.push("/");
      return;
    }

    fetchUsers();
  }, [session, status, router]);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch {
      setError("Ошибка загрузки пользователей");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Ошибка создания пользователя");
        return;
      }

      setShowForm(false);
      setFormData({ email: "", password: "", name: "", role: "EDITOR" });
      fetchUsers();
    } catch {
      setFormError("Ошибка при создании пользователя");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDeleteUser(id: string, email: string) {
    if (!confirm(`Удалить пользователя ${email}?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка удаления");
        return;
      }

      fetchUsers();
    } catch {
      alert("Ошибка при удалении пользователя");
    }
  }

  async function handleRoleChange(id: string, newRole: string) {
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка обновления");
        return;
      }

      fetchUsers();
    } catch {
      alert("Ошибка при обновлении роли");
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Загрузка...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/20 border border-destructive/30 text-destructive px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Пользователи</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Управление пользователями системы
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-accent text-sm"
          data-testid="add-user-btn"
        >
          {showForm ? "Отмена" : "Добавить пользователя"}
        </button>
      </div>

      {showForm && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-foreground mb-4">Новый пользователь</h3>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {formError && (
              <div className="bg-destructive/20 border border-destructive/30 text-destructive px-4 py-3 rounded text-sm">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  data-testid="new-user-email"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Пароль *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  data-testid="new-user-password"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  data-testid="new-user-name"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">
                  Роль
                </label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      role: e.target.value as "ADMIN" | "EDITOR" | "READER",
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  data-testid="new-user-role"
                >
                  <option value="EDITOR">Редактор</option>
                  <option value="READER">Читатель</option>
                  <option value="ADMIN">Администратор</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={formLoading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-accent disabled:opacity-50 text-sm"
                data-testid="create-user-btn"
              >
                {formLoading ? "Создание..." : "Создать"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Пользователь
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Роль
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Статей
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Создан
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {user.name || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    disabled={user.id === session?.user?.id}
                    className="text-xs border border-border rounded px-2 py-1 bg-background text-foreground disabled:bg-muted disabled:cursor-not-allowed"
                    data-testid={`user-role-${user.id}`}
                  >
                    <option value="ADMIN">Администратор</option>
                    <option value="EDITOR">Редактор</option>
                    <option value="READER">Читатель</option>
                  </select>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {user._count.articles}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString("ru-RU")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                  {user.id !== session?.user?.id && (
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-destructive hover:text-destructive/80 text-xs"
                      data-testid={`delete-user-${user.id}`}
                    >
                      Удалить
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
