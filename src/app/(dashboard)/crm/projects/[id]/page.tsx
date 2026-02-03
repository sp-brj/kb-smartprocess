"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Task = {
  id: string;
  title: string;
  status: "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  deadline: string | null;
  assignee: { id: string; name: string | null; email: string } | null;
};

type Payment = {
  id: string;
  amount: string;
  date: string;
  type: "ADVANCE" | "MILESTONE" | "FINAL";
  status: "PENDING" | "RECEIVED" | "CANCELLED";
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  plannedStart: string | null;
  plannedEnd: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  budget: string | null;
  client: { id: string; name: string; inn: string | null };
  status: { id: string; name: string; color: string; type: string };
  manager: { id: string; name: string | null; email: string };
  tasks: Task[];
  payments: Payment[];
  totalMinutes: number;
  totalPaid: number;
};

const projectTypeLabels: Record<string, string> = {
  IMPLEMENTATION: "Внедрение",
  CONSULTING: "Консалтинг",
  DEVELOPMENT: "Доработка",
  SUPPORT: "Сопровождение",
};

const taskStatusLabels: Record<string, string> = {
  TODO: "К выполнению",
  IN_PROGRESS: "В работе",
  REVIEW: "На проверке",
  DONE: "Выполнено",
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500",
  MEDIUM: "text-blue-500",
  HIGH: "text-orange-500",
  URGENT: "text-red-500",
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

function formatMoney(amount: number | string | null): string {
  if (!amount) return "—";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(num);
}

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchProject() {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        setError("Проект не найден");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProject(data);
      setLoading(false);
    }
    fetchProject();
  }, [id]);

  async function handleDelete() {
    if (!confirm("Удалить проект? Это действие необратимо.")) return;

    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/crm/projects");
    } else {
      const data = await res.json();
      alert(data.error || "Ошибка удаления");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (error || !project) {
    return <div className="p-8 text-center text-destructive">{error || "Проект не найден"}</div>;
  }

  const budgetNum = project.budget ? parseFloat(project.budget) : 0;
  const paidPercent = budgetNum > 0 ? (project.totalPaid / budgetNum) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/crm/projects"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Все проекты
          </Link>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-3">
            {project.name}
            <span
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${project.status.color}20`,
                color: project.status.color,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.status.color }} />
              {project.status.name}
            </span>
          </h2>
          <p className="text-muted-foreground mt-1">
            <Link href={`/crm/clients/${project.client.id}`} className="hover:text-foreground">
              {project.client.name}
            </Link>
            {" • "}
            {projectTypeLabels[project.type]}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/projects/${id}/edit`}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            Редактировать
          </Link>
          <button
            onClick={handleDelete}
            className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
          >
            Удалить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Время</div>
              <div className="text-xl font-semibold text-foreground">
                {formatDuration(project.totalMinutes)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Бюджет</div>
              <div className="text-xl font-semibold text-foreground">
                {formatMoney(project.budget)}
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Оплачено</div>
              <div className="text-xl font-semibold text-foreground">
                {formatMoney(project.totalPaid)}
                {budgetNum > 0 && (
                  <span className="text-sm text-muted-foreground ml-1">
                    ({paidPercent.toFixed(0)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-medium text-foreground mb-3">Описание</h3>
              <div className="text-foreground whitespace-pre-wrap">{project.description}</div>
            </div>
          )}

          {/* Tasks */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Задачи</h3>
              <Link
                href={`/crm/tasks/new?projectId=${id}`}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Добавить
              </Link>
            </div>
            {project.tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет задач</p>
            ) : (
              <div className="space-y-2">
                {project.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`text-sm ${priorityColors[task.priority]}`}>●</span>
                      <div>
                        <div className="font-medium text-foreground">{task.title}</div>
                        {task.assignee && (
                          <div className="text-sm text-muted-foreground">
                            {task.assignee.name || task.assignee.email}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {taskStatusLabels[task.status]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-medium text-foreground mb-4">Детали</h3>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Менеджер</dt>
                <dd className="text-foreground">{project.manager.name || project.manager.email}</dd>
              </div>
              {project.plannedStart && (
                <div>
                  <dt className="text-muted-foreground">Плановое начало</dt>
                  <dd className="text-foreground">
                    {new Date(project.plannedStart).toLocaleDateString("ru-RU")}
                  </dd>
                </div>
              )}
              {project.plannedEnd && (
                <div>
                  <dt className="text-muted-foreground">Плановое окончание</dt>
                  <dd className="text-foreground">
                    {new Date(project.plannedEnd).toLocaleDateString("ru-RU")}
                  </dd>
                </div>
              )}
              {project.actualStart && (
                <div>
                  <dt className="text-muted-foreground">Фактическое начало</dt>
                  <dd className="text-foreground">
                    {new Date(project.actualStart).toLocaleDateString("ru-RU")}
                  </dd>
                </div>
              )}
              {project.actualEnd && (
                <div>
                  <dt className="text-muted-foreground">Фактическое окончание</dt>
                  <dd className="text-foreground">
                    {new Date(project.actualEnd).toLocaleDateString("ru-RU")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Payments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Оплаты</h3>
              <button className="text-sm text-primary hover:text-primary/80">+ Добавить</button>
            </div>
            {project.payments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет оплат</p>
            ) : (
              <div className="space-y-2">
                {project.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="text-foreground">{formatMoney(payment.amount)}</div>
                      <div className="text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString("ru-RU")}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        payment.status === "RECEIVED"
                          ? "bg-green-500/10 text-green-500"
                          : payment.status === "PENDING"
                            ? "bg-yellow-500/10 text-yellow-500"
                            : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {payment.status === "RECEIVED"
                        ? "Получена"
                        : payment.status === "PENDING"
                          ? "Ожидается"
                          : "Отменена"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
