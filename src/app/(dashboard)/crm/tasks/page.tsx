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

const statusBorderColors: Record<string, string> = {
  TODO: "border-t-gray-500",
  IN_PROGRESS: "border-t-blue-500",
  REVIEW: "border-t-yellow-500",
  DONE: "border-t-green-500",
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

const columns: ("TODO" | "IN_PROGRESS" | "REVIEW" | "DONE")[] = [
  "TODO",
  "IN_PROGRESS",
  "REVIEW",
  "DONE",
];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [scope, setScope] = useState<"my" | "all">("all"); // По умолчанию все задачи
  const [view, setView] = useState<"list" | "kanban">("list");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTasks() {
      setLoading(true);
      const url = scope === "my" ? "/api/tasks?my=true" : "/api/tasks";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
      setLoading(false);
    }
    fetchTasks();
  }, [scope]);

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

  function handleDragStart(taskId: string) {
    setDraggedTaskId(taskId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  async function handleDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault();
    if (!draggedTaskId) return;

    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === newStatus) {
      setDraggedTaskId(null);
      return;
    }

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTaskId ? { ...t, status: newStatus as Task["status"] } : t
      )
    );

    // Update on server
    const res = await fetch(`/api/tasks/${draggedTaskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      // Revert on error
      setTasks((prev) =>
        prev.map((t) =>
          t.id === draggedTaskId ? { ...t, status: task.status } : t
        )
      );
    }

    setDraggedTaskId(null);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold text-foreground">Задачи</h2>
          {/* Scope switcher (My/All) */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setScope("all")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                scope === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-scope-all"
            >
              Все
            </button>
            <button
              onClick={() => setScope("my")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                scope === "my"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-scope-my"
            >
              Мои
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* View switcher */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setView("list")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                view === "list"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-view-list"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              Список
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 ${
                view === "kanban"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="tasks-view-kanban"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              Канбан
            </button>
          </div>
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
      ) : view === "kanban" ? (
        /* Kanban View */
        <div className="grid grid-cols-4 gap-4 min-h-[500px]" data-testid="tasks-kanban-board">
          {columns.map((status) => {
            const columnTasks = groupedByStatus[status];
            return (
              <div
                key={status}
                className={`bg-muted/30 rounded-lg border-t-4 ${statusBorderColors[status]}`}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, status)}
                data-testid={`tasks-kanban-column-${status}`}
              >
                <div className="px-4 py-3 border-b border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{statusLabels[status]}</span>
                    <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {columnTasks.length}
                    </span>
                  </div>
                </div>
                <div className="p-3 space-y-2">
                  {columnTasks.map((task) => (
                    <KanbanTaskCard
                      key={task.id}
                      task={task}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-card border border-border rounded-lg divide-y divide-border" data-testid="tasks-list-view">
          {filteredTasks.map((task) => (
            <ListTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}

function KanbanTaskCard({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (id: string) => void;
}) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="p-3 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
      data-testid={`tasks-kanban-task-${task.id}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-sm mt-0.5 ${priorityColors[task.priority]}`}>●</span>
        <div className="flex-1 min-w-0">
          <Link
            href={`/crm/projects/${task.project.id}/kanban`}
            className="font-medium text-foreground hover:text-primary block truncate"
          >
            {task.title}
          </Link>
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
    </div>
  );
}

function ListTaskCard({ task }: { task: Task }) {
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <Link
      href={`/crm/projects/${task.project.id}/kanban`}
      className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
      data-testid={`tasks-list-task-${task.id}`}
    >
      <span className={`text-sm ${priorityColors[task.priority]}`}>●</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-foreground">{task.title}</div>
        <div className="text-sm text-muted-foreground">{task.project.name}</div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        {task.checklistTotal > 0 && (
          <span className="text-muted-foreground">
            ✓ {task.checklistCompleted}/{task.checklistTotal}
          </span>
        )}
        {task.deadline && (
          <span className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
            {new Date(task.deadline).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
          </span>
        )}
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
          {statusLabels[task.status]}
        </span>
      </div>
    </Link>
  );
}
