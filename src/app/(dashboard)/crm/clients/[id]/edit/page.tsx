"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
};

export default function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    inn: "",
    kpp: "",
    ogrn: "",
    legalAddress: "",
    actualAddress: "",
    notes: "",
    status: "ACTIVE" as "ACTIVE" | "ARCHIVED",
  });

  useEffect(() => {
    async function fetchClient() {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        setError("Клиент не найден");
        setLoading(false);
        return;
      }
      const data: Client = await res.json();
      setFormData({
        name: data.name,
        inn: data.inn || "",
        kpp: data.kpp || "",
        ogrn: data.ogrn || "",
        legalAddress: data.legalAddress || "",
        actualAddress: data.actualAddress || "",
        notes: data.notes || "",
        status: data.status,
      });
      setLoading(false);
    }
    fetchClient();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Ошибка обновления");
      }

      router.push(`/crm/clients/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (error && !formData.name) {
    return (
      <div className="p-8 text-center text-destructive">{error}</div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link
          href={`/crm/clients/${id}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Назад к клиенту
        </Link>
        <h2 className="text-xl font-semibold text-foreground mt-2">
          Редактирование клиента
        </h2>
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
              Название компании <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
              data-testid="client-name-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ИНН</label>
              <input
                type="text"
                value={formData.inn}
                onChange={(e) => setFormData({ ...formData, inn: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">КПП</label>
              <input
                type="text"
                value={formData.kpp}
                onChange={(e) => setFormData({ ...formData, kpp: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">ОГРН</label>
              <input
                type="text"
                value={formData.ogrn}
                onChange={(e) => setFormData({ ...formData, ogrn: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Статус</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as "ACTIVE" | "ARCHIVED" })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="ACTIVE">Активный</option>
              <option value="ARCHIVED">В архиве</option>
            </select>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-foreground">Адреса</h3>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Юридический адрес</label>
            <input
              type="text"
              value={formData.legalAddress}
              onChange={(e) => setFormData({ ...formData, legalAddress: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Фактический адрес</label>
            <input
              type="text"
              value={formData.actualAddress}
              onChange={(e) => setFormData({ ...formData, actualAddress: e.target.value })}
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="font-medium text-foreground">Заметки</h3>

          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Заметки о клиенте (поддерживается Markdown)"
              className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !formData.name.trim()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            data-testid="save-client-button"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
          <Link
            href={`/crm/clients/${id}`}
            className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Отмена
          </Link>
        </div>
      </form>
    </div>
  );
}
