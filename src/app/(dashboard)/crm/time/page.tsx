"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TimeEntry = {
  id: string;
  date: string;
  duration: number;
  workType: string;
  description: string | null;
  billable: boolean;
  project: { id: string; name: string; client: { name: string } };
  task: { id: string; title: string } | null;
};

type Project = { id: string; name: string };

const workTypeLabels: Record<string, string> = {
  CONSULTATION: "Консультация",
  DEVELOPMENT: "Разработка",
  TRAINING: "Обучение",
  TESTING: "Тестирование",
  DOCUMENTATION: "Документация",
  MEETING: "Совещание",
  OTHER: "Прочее",
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

export default function TimePage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    projectId: "",
    date: new Date().toISOString().split("T")[0],
    duration: "",
    workType: "OTHER",
    description: "",
    billable: true,
  });

  useEffect(() => {
    async function fetchData() {
      const [entriesRes, projectsRes] = await Promise.all([
        fetch("/api/time-entries?my=true"),
        fetch("/api/projects"),
      ]);

      if (entriesRes.ok) setEntries(await entriesRes.json());
      if (projectsRes.ok) setProjects(await projectsRes.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.projectId || !formData.duration) return;

    const res = await fetch("/api/time-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...formData,
        duration: parseInt(formData.duration),
      }),
    });

    if (res.ok) {
      const entry = await res.json();
      setEntries([entry, ...entries]);
      setFormData({
        projectId: "",
        date: new Date().toISOString().split("T")[0],
        duration: "",
        workType: "OTHER",
        description: "",
        billable: true,
      });
      setShowForm(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Удалить запись?")) return;

    const res = await fetch(`/api/time-entries/${id}`, { method: "DELETE" });
    if (res.ok) {
      setEntries(entries.filter((e) => e.id !== id));
    }
  }

  // Группируем по дням
  const entriesByDate = entries.reduce((acc, entry) => {
    const date = entry.date.split("T")[0];
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, TimeEntry[]>);

  const totalToday = entries
    .filter((e) => e.date.split("T")[0] === new Date().toISOString().split("T")[0])
    .reduce((sum, e) => sum + e.duration, 0);

  const totalWeek = entries.reduce((sum, e) => sum + e.duration, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Журнал времени</h2>
          <p className="text-sm text-muted-foreground">
            Сегодня: {formatDuration(totalToday)} • Всего: {formatDuration(totalWeek)}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/crm/time/report"
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Отчет
          </Link>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Записать время
          </button>
        </div>
      </div>

      {/* Quick add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="col-span-2">
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                data-testid="time-entry-project-select"
              >
                <option value="">Проект...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                data-testid="time-entry-date-input"
              />
            </div>
            <div>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                placeholder="Минуты"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                min="1"
                data-testid="time-entry-minutes-input"
              />
            </div>
            <div>
              <select
                value={formData.workType}
                onChange={(e) => setFormData({ ...formData, workType: e.target.value })}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="time-entry-work-type-select"
              >
                {Object.entries(workTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                data-testid="save-time-entry-button"
              >
                Добавить
              </button>
            </div>
          </div>
          <div className="mt-3">
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Описание работы..."
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="time-entry-description-input"
            />
          </div>
        </form>
      )}

      {/* Entries list */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : entries.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          Нет записей. Начните отслеживать время!
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(entriesByDate)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, dayEntries]) => {
              const dayTotal = dayEntries.reduce((sum, e) => sum + e.duration, 0);
              return (
                <div key={date}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-foreground">
                      {new Date(date).toLocaleDateString("ru-RU", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </h3>
                    <span className="text-sm text-muted-foreground">{formatDuration(dayTotal)}</span>
                  </div>
                  <div className="bg-card border border-border rounded-lg divide-y divide-border">
                    {dayEntries.map((entry) => (
                      <div key={entry.id} className="p-4 flex items-center gap-4">
                        <div className="flex-1">
                          <div className="font-medium text-foreground">
                            {entry.project.name}
                            <span className="text-muted-foreground font-normal">
                              {" "}— {entry.project.client.name}
                            </span>
                          </div>
                          {entry.task && (
                            <div className="text-sm text-muted-foreground">
                              Задача: {entry.task.title}
                            </div>
                          )}
                          {entry.description && (
                            <div className="text-sm text-muted-foreground mt-1">
                              {entry.description}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-foreground">
                            {formatDuration(entry.duration)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {workTypeLabels[entry.workType]}
                            {entry.billable && " • Оплачиваемое"}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
