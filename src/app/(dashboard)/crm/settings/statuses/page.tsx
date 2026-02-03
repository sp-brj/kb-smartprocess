"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

type ProjectStatus = {
  id: string;
  name: string;
  color: string;
  order: number;
  type: string;
  isDefault: boolean;
  _count: { projects: number };
};

const statusTypes = [
  { value: "LEAD", label: "Лид" },
  { value: "NEGOTIATION", label: "Переговоры" },
  { value: "CONTRACT", label: "Договор" },
  { value: "WORK", label: "В работе" },
  { value: "DONE", label: "Завершён" },
  { value: "CANCELLED", label: "Отменён" },
];

const defaultColors = [
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // emerald
  "#6B7280", // gray
  "#EF4444", // red
  "#06B6D4", // cyan
];

export default function StatusesSettingsPage() {
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [newStatus, setNewStatus] = useState({
    name: "",
    color: "#3B82F6",
    type: "WORK",
    isDefault: false,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", color: "" });
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetchStatuses();
  }, []);

  async function fetchStatuses() {
    const res = await fetch("/api/project-statuses");
    if (res.ok) {
      setStatuses(await res.json());
    }
    setLoading(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newStatus.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/project-statuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStatus),
      });

      if (res.ok) {
        await fetchStatuses();
        setShowForm(false);
        setNewStatus({ name: "", color: "#3B82F6", type: "WORK", isDefault: false });
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка создания");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string) {
    if (!editForm.name.trim()) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/project-statuses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        await fetchStatuses();
        setEditingId(null);
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка обновления");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, projectCount: number) {
    if (projectCount > 0) {
      alert(`Невозможно удалить: ${projectCount} проектов используют этот статус`);
      return;
    }

    if (!confirm("Удалить статус?")) return;

    const res = await fetch(`/api/project-statuses/${id}`, { method: "DELETE" });
    if (res.ok) {
      await fetchStatuses();
    } else {
      const data = await res.json();
      alert(data.error || "Ошибка удаления");
    }
  }

  async function handleSetDefault(id: string) {
    const res = await fetch(`/api/project-statuses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });

    if (res.ok) {
      await fetchStatuses();
    }
  }

  // Drag and drop handlers
  function handleDragStart(index: number) {
    dragItem.current = index;
  }

  function handleDragEnter(index: number) {
    dragOverItem.current = index;
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...statuses];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);

    // Update order values
    const reordered = items.map((item, index) => ({ ...item, order: index + 1 }));
    setStatuses(reordered);

    dragItem.current = null;
    dragOverItem.current = null;

    // Save new order to backend
    for (const item of reordered) {
      await fetch(`/api/project-statuses/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: item.order }),
      });
    }
  }

  function startEditing(status: ProjectStatus) {
    setEditingId(status.id);
    setEditForm({ name: status.name, color: status.color });
  }

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Загрузка...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Статусы проектов</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Настройте воронку статусов для ваших проектов
          </p>
        </div>
        <Link
          href="/crm/projects"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Назад к проектам
        </Link>
      </div>

      {/* Status list */}
      <div className="bg-card border border-border rounded-lg divide-y divide-border">
        {statuses.map((status, index) => (
          <div
            key={status.id}
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="flex items-center gap-3 p-4 hover:bg-muted/30 cursor-move group"
          >
            {/* Drag handle */}
            <div className="text-muted-foreground/50 group-hover:text-muted-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>

            {/* Color indicator */}
            {editingId === status.id ? (
              <input
                type="color"
                value={editForm.color}
                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                className="w-6 h-6 rounded cursor-pointer border-0"
              />
            ) : (
              <div
                className="w-6 h-6 rounded"
                style={{ backgroundColor: status.color }}
              />
            )}

            {/* Name */}
            <div className="flex-1">
              {editingId === status.id ? (
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-2 py-1 bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleUpdate(status.id);
                    if (e.key === "Escape") setEditingId(null);
                  }}
                />
              ) : (
                <span className="font-medium text-foreground">{status.name}</span>
              )}
            </div>

            {/* Type badge */}
            <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
              {statusTypes.find((t) => t.value === status.type)?.label || status.type}
            </span>

            {/* Project count */}
            <span className="text-xs text-muted-foreground">
              {status._count.projects} проект{status._count.projects === 1 ? "" : status._count.projects < 5 ? "а" : "ов"}
            </span>

            {/* Default badge */}
            {status.isDefault && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                По умолчанию
              </span>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId === status.id ? (
                <>
                  <button
                    onClick={() => handleUpdate(status.id)}
                    disabled={saving}
                    className="p-1.5 text-primary hover:text-primary/80"
                    title="Сохранить"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                    title="Отмена"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  {!status.isDefault && (
                    <button
                      onClick={() => handleSetDefault(status.id)}
                      className="p-1.5 text-muted-foreground hover:text-primary"
                      title="Сделать по умолчанию"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => startEditing(status)}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(status.id, status._count.projects)}
                    className="p-1.5 text-muted-foreground hover:text-destructive"
                    title={status._count.projects > 0 ? "Нельзя удалить — есть проекты" : "Удалить"}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add new status */}
      <div className="mt-4">
        {showForm ? (
          <form onSubmit={handleCreate} className="bg-card border border-border rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Название *
                </label>
                <input
                  type="text"
                  value={newStatus.name}
                  onChange={(e) => setNewStatus({ ...newStatus, name: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Название статуса"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Тип *
                </label>
                <select
                  value={newStatus.type}
                  onChange={(e) => setNewStatus({ ...newStatus, type: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {statusTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Цвет
              </label>
              <div className="flex items-center gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewStatus({ ...newStatus, color })}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      newStatus.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                <input
                  type="color"
                  value={newStatus.color}
                  onChange={(e) => setNewStatus({ ...newStatus, color: e.target.value })}
                  className="w-8 h-8 rounded cursor-pointer border-0"
                  title="Выбрать другой цвет"
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newStatus.isDefault}
                onChange={(e) => setNewStatus({ ...newStatus, isDefault: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Статус по умолчанию для новых проектов</span>
            </label>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Создать статус"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-md hover:bg-muted/80"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowForm(true)}
            className="w-full py-3 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-muted-foreground transition-colors"
          >
            + Добавить статус
          </button>
        )}
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-4">
        Перетащите статусы для изменения порядка в воронке. Статус по умолчанию назначается новым проектам автоматически.
      </p>
    </div>
  );
}
