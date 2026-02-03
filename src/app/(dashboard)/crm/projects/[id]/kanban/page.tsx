"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
  checklist: { id: string; text: string; completed: boolean }[];
};

type Project = {
  id: string;
  name: string;
  client: { id: string; name: string };
};

const statusLabels: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  REVIEW: "На проверке",
  DONE: "Выполнено",
};

const statusColors: Record<string, string> = {
  TODO: "border-gray-500",
  IN_PROGRESS: "border-blue-500",
  REVIEW: "border-yellow-500",
  DONE: "border-green-500",
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

export default function KanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const [projectRes, tasksRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch(`/api/tasks?projectId=${id}`),
      ]);

      if (projectRes.ok) setProject(await projectRes.json());
      if (tasksRes.ok) setTasks(await tasksRes.json());
      setLoading(false);
    }
    fetchData();
  }, [id]);

  async function handleStatusChange(taskId: string, newStatus: string) {
    const res = await fetch(`/api/tasks/${taskId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: updated.status } : t))
      );
    }
  }

  function handleDragStart(taskId: string) {
    setDraggedTask(taskId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, status: string) {
    e.preventDefault();
    if (draggedTask) {
      handleStatusChange(draggedTask, status);
      setDraggedTask(null);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (!project) {
    return <div className="p-8 text-center text-destructive">Проект не найден</div>;
  }

  const columns = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/crm/projects/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {project.name}
          </Link>
          <h2 className="text-xl font-semibold text-foreground">Канбан-доска</h2>
        </div>
        <Link
          href={`/crm/tasks/new?projectId=${id}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новая задача
        </Link>
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-4 gap-4 min-h-[500px]">
        {columns.map((status) => {
          const columnTasks = tasks.filter((t) => t.status === status);
          return (
            <div
              key={status}
              className={`bg-muted/30 rounded-lg border-t-4 ${statusColors[status]}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{statusLabels[status]}</span>
                  <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>
              </div>
              <div className="p-2 space-y-2 min-h-[400px]">
                {columnTasks.map((task) => (
                  <TaskCard
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
    </div>
  );
}

function TaskCard({
  task,
  onDragStart,
}: {
  task: Task;
  onDragStart: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = task.checklist.filter((i) => i.completed).length;
  const totalCount = task.checklist.length;
  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <div
      draggable
      onDragStart={() => onDragStart(task.id)}
      className="p-3 bg-card border border-border rounded-lg cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-2 mb-2">
        <span className={`text-sm mt-0.5 ${priorityColors[task.priority]}`}>●</span>
        <div className="flex-1 min-w-0">
          <div
            className="font-medium text-foreground cursor-pointer hover:text-primary"
            onClick={() => setExpanded(!expanded)}
          >
            {task.title}
          </div>
          {task.assignee && (
            <div className="text-xs text-muted-foreground mt-1">
              {task.assignee.name || task.assignee.email}
            </div>
          )}
        </div>
      </div>

      {expanded && task.description && (
        <div className="text-sm text-muted-foreground mb-2 whitespace-pre-wrap">
          {task.description}
        </div>
      )}

      {expanded && task.checklist.length > 0 && (
        <div className="space-y-1 mb-2">
          {task.checklist.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              <span className={item.completed ? "text-green-500" : "text-muted-foreground"}>
                {item.completed ? "✓" : "○"}
              </span>
              <span className={item.completed ? "line-through text-muted-foreground" : "text-foreground"}>
                {item.text}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          {totalCount > 0 && (
            <span className="text-muted-foreground">
              ✓ {completedCount}/{totalCount}
            </span>
          )}
        </div>
        {task.deadline && (
          <span className={isOverdue ? "text-red-500" : "text-muted-foreground"}>
            {new Date(task.deadline).toLocaleDateString("ru-RU", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
    </div>
  );
}
