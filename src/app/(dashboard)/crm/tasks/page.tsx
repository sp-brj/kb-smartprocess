"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline: string | null;
  project: { id: string; name: string };
  assignee: { id: string; name: string | null; email: string } | null;
  checklistCompleted: number;
  checklistTotal: number;
};

const statusLabels: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  REVIEW: "На проверке",
  DONE: "Выполнено",
};

const statusColors: Record<string, string> = {
  TODO: "bg-gray-500/10 text-gray-500",
  IN_PROGRESS: "bg-blue-500/10 text-blue-500",
  REVIEW: "bg-yellow-500/10 text-yellow-500",
  DONE: "bg-green-500/10 text-green-500",
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const res = await fetch("/api/tasks?my=true");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
      setLoading(false);
    }
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter((task) => {
    if (filter === "active") return task.status !== "DONE";
    if (filter === "done") return task.status === "DONE";
    return true;
  });

  const groupedByStatus = {
    TODO: filteredTasks.filter((t) => t.status === "TODO"),
    IN_PROGRESS: filteredTasks.filter((t) => t.status === "IN_PROGRESS"),
    REVIEW: filteredTasks.filter((t) => t.status === "REVIEW"),
    DONE: filteredTasks.filter((t) => t.status === "DONE"),
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Мои задачи</h2>
        <div className="flex items-center gap-3">
          {/* Filter */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "active"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-filter-active"
            >
              Активные
            </button>
            <button
              onClick={() => setFilter("done")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "done"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-filter-done"
            >
              Выполненные
            </button>
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                filter === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-filter-all"
            >
              Все
            </button>
          </div>
          <Link
            href="/crm/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            data-testid="new-task-button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новая задача
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          {filter === "active" ? "Нет активных задач" : filter === "done" ? "Нет выполненных задач" : "Нет задач"}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {(["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const).map((status) => (
            <div key={status} className="space-y-3">
              <div className="flex items-center gap-2 px-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}>
                  {statusLabels[status]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {groupedByStatus[status].length}
                </span>
              </div>
              <div className="space-y-2">
                {groupedByStatus[status].map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskCard({ task }: { task: Task }) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <Link
      href={`/crm/projects/${task.project.id}/kanban`}
      className="block p-3 bg-card border border-border rounded-lg hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-sm ${priorityColors[task.priority]}`}>●</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-foreground truncate">{task.title}</div>
          <div className="text-xs text-muted-foreground truncate">{task.project.name}</div>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {task.checklistTotal > 0 && (
            <span className="text-muted-foreground">
              ✓ {task.checklistCompleted}/{task.checklistTotal}
            </span>
          )}
        </div>
        {task.deadline && (
          <span className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
            {new Date(task.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </span>
        )}
      </div>
    </Link>
  );
}
