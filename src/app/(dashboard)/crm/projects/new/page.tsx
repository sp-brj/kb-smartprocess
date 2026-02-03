"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

type Client = { id: string; name: string };
type ProjectStatus = { id: string; name: string; color: string; isDefault: boolean };
type User = { id: string; name: string | null; email: string };

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("clientId");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    clientId: preselectedClientId || "",
    statusId: "",
    type: "IMPLEMENTATION",
    plannedStart: "",
    plannedEnd: "",
    budget: "",
    managerId: "",
  });

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, statusesRes, usersRes] = await Promise.all([
        fetch("/api/clients?status=ACTIVE"),
        fetch("/api/project-statuses"),
        fetch("/api/admin/users"),
      ]);

      if (clientsRes.ok) setClients(await clientsRes.json());
      if (statusesRes.ok) {
        const statusData = await statusesRes.json();
        setStatuses(statusData);
        const defaultStatus = statusData.find((s: ProjectStatus) => s.isDefault);
        if (defaultStatus) {
          setFormData((prev) => ({ ...prev, statusId: defaultStatus.id }));
        }
      }
      if (usersRes.ok) setUsers(await usersRes.json());
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: formData.budget ? parseFloat(formData.budget) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка создания проекта");
      }

      const project = await res.json();
      router.push(`/crm/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href="/crm/projects"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к списку
        </Link>
        <h2 className="text-xl font-semibold text-foreground mt-2">Новый проект</h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-foreground">Основная информация</h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Название проекта <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              data-testid="project-name-input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Клиент <span className="text-destructive">*</span>
            </label>
            <select
              value={formData.clientId}
              onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              data-testid="project-client-select"
            >
              <option value="">Выберите клиента</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Тип проекта <span className="text-destructive">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="project-type-select"
              >
                <option value="IMPLEMENTATION">Внедрение</option>
                <option value="CONSULTING">Консалтинг</option>
                <option value="DEVELOPMENT">Доработка</option>
                <option value="SUPPORT">Сопровождение</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Статус
              </label>
              <select
                value={formData.statusId}
                onChange={(e) => setFormData({ ...formData, statusId: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                {statuses.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Менеджер проекта
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="">Я (по умолчанию)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Описание
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Описание проекта (поддерживается Markdown)"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-foreground">Сроки и бюджет</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Плановое начало
              </label>
              <input
                type="date"
                value={formData.plannedStart}
                onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Плановое окончание
              </label>
              <input
                type="date"
                value={formData.plannedEnd}
                onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Бюджет (руб.)
            </label>
            <input
              type="number"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              placeholder="0"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !formData.name.trim() || !formData.clientId}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="save-project-button"
          >
            {saving ? "Сохранение..." : "Создать проект"}
          </button>
          <Link
            href="/crm/projects"
            className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Загрузка...</div>}>
      <NewProjectForm />
    </Suspense>
  );
}
