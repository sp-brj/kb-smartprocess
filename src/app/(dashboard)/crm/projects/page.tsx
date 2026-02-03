"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ProjectStatus = {
  id: string;
  name: string;
  color: string;
  order: number;
  type: string;
};

type Project = {
  id: string;
  name: string;
  type: string;
  plannedEnd: string | null;
  budget: string | null;
  client: { id: string; name: string };
  status: ProjectStatus;
  manager: { id: string; name: string | null; email: string };
  _count: { tasks: number };
};

const projectTypeLabels: Record<string, string> = {
  IMPLEMENTATION: "Внедрение",
  CONSULTING: "Консалтинг",
  DEVELOPMENT: "Доработка",
  SUPPORT: "Сопровождение",
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [statuses, setStatuses] = useState<ProjectStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [projectsRes, statusesRes] = await Promise.all([
        fetch(`/api/projects${search ? `?search=${encodeURIComponent(search)}` : ""}`),
        fetch("/api/project-statuses"),
      ]);

      if (projectsRes.ok) setProjects(await projectsRes.json());
      if (statusesRes.ok) setStatuses(await statusesRes.json());
      setLoading(false);
    }

    const debounce = setTimeout(fetchData, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  // TODO: handleStatusChange для drag-drop в pipeline view
  // async function handleStatusChange(projectId: string, newStatusId: string) {
  //   const res = await fetch(`/api/projects/${projectId}/status`, { ... });
  // }

  const projectsByStatus = statuses.map((status) => ({
    status,
    projects: projects.filter((p) => p.status.id === status.id),
  }));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Проекты</h2>
        <div className="flex items-center gap-3">
          {/* View toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Таблица
            </button>
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                viewMode === "pipeline"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Воронка
            </button>
          </div>
          <Link
            href="/crm/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="new-project-button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новый проект
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Поиск по названию или клиенту..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : viewMode === "table" ? (
        /* Table view */
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          {projects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              {search ? "Проекты не найдены" : "Нет проектов. Создайте первый!"}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Проект</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Клиент</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Тип</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Статус</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Менеджер</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Задачи</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm/projects/${project.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        {project.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/crm/clients/${project.client.id}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {project.client.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {projectTypeLabels[project.type] || project.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `${project.status.color}20`,
                          color: project.status.color,
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.status.color }}
                        />
                        {project.status.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.manager.name || project.manager.email}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project._count.tasks}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        /* Pipeline view */
        <div className="flex gap-4 overflow-x-auto pb-4">
          {projectsByStatus.map(({ status, projects: statusProjects }) => (
            <div
              key={status.id}
              className="flex-shrink-0 w-72 bg-muted/30 rounded-lg"
            >
              <div
                className="px-4 py-3 border-b border-border flex items-center gap-2"
                style={{ borderTopColor: status.color, borderTopWidth: 3 }}
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: status.color }}
                />
                <span className="font-medium text-foreground">{status.name}</span>
                <span className="ml-auto text-sm text-muted-foreground">
                  {statusProjects.length}
                </span>
              </div>
              <div className="p-2 space-y-2 min-h-[200px]">
                {statusProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/crm/projects/${project.id}`}
                    className="block p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div className="font-medium text-foreground mb-1">
                      {project.name}
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {project.client.name}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{projectTypeLabels[project.type]}</span>
                      <span>{project._count.tasks} задач</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
