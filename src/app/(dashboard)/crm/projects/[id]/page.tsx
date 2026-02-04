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
  subtasks?: Task[];
  _count?: { subtasks: number };
};

type Payment = {
  id: string;
  amount: string;
  date: string;
  type: "ADVANCE" | "MILESTONE" | "FINAL";
  status: "PENDING" | "RECEIVED" | "CANCELLED";
  documentNumber: string | null;
  description: string | null;
};

const paymentTypeLabels: Record<string, string> = {
  ADVANCE: "Аванс",
  MILESTONE: "Этап",
  FINAL: "Финал",
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    type: "MILESTONE" as "ADVANCE" | "MILESTONE" | "FINAL",
    status: "PENDING" as "PENDING" | "RECEIVED" | "CANCELLED",
    documentNumber: "",
    description: "",
  });
  const [paymentSaving, setPaymentSaving] = useState(false);

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

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.amount) return;

    setPaymentSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: id,
          ...paymentForm,
        }),
      });

      if (res.ok) {
        const newPayment = await res.json();
        setProject((prev) =>
          prev ? { ...prev, payments: [newPayment, ...prev.payments] } : null
        );
        setShowPaymentForm(false);
        setPaymentForm({
          amount: "",
          date: new Date().toISOString().split("T")[0],
          type: "MILESTONE",
          status: "PENDING",
          documentNumber: "",
          description: "",
        });
        // Refresh to get updated totalPaid
        const projectRes = await fetch(`/api/projects/${id}`);
        if (projectRes.ok) {
          setProject(await projectRes.json());
        }
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка добавления оплаты");
      }
    } finally {
      setPaymentSaving(false);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    if (!confirm("Удалить оплату?")) return;

    const res = await fetch(`/api/payments/${paymentId}`, { method: "DELETE" });
    if (res.ok) {
      // Refresh project to get updated data
      const projectRes = await fetch(`/api/projects/${id}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
    } else {
      const data = await res.json();
      alert(data.error || "Ошибка удаления");
    }
  }

  async function handleUpdatePaymentStatus(paymentId: string, newStatus: "PENDING" | "RECEIVED" | "CANCELLED") {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const projectRes = await fetch(`/api/projects/${id}`);
      if (projectRes.ok) {
        setProject(await projectRes.json());
      }
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
            href={`/crm/projects/${id}/kanban`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
            Канбан
          </Link>
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

          {/* Tasks with Epics */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Структура работ</h3>
              <div className="flex gap-2">
                <Link
                  href={`/crm/tasks/new?projectId=${id}`}
                  className="text-sm text-primary hover:text-primary/80"
                >
                  + Эпик
                </Link>
              </div>
            </div>
            {project.tasks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет задач. Создайте первый эпик для структурирования работ.</p>
            ) : (
              <div className="space-y-4">
                {project.tasks.map((task) => {
                  const isEpic = (task._count?.subtasks || 0) > 0 || (task.subtasks && task.subtasks.length > 0);
                  const subtasks = task.subtasks || [];
                  const completedSubtasks = subtasks.filter(s => s.status === "DONE").length;
                  const totalSubtasks = subtasks.length;
                  const progress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

                  if (isEpic) {
                    // Эпик с подзадачами
                    return (
                      <div key={task.id} className="border border-border rounded-lg overflow-hidden">
                        {/* Epic header */}
                        <div className="p-4 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">📦</span>
                              <div>
                                <div className="font-medium text-foreground">{task.title}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {completedSubtasks} / {totalSubtasks} задач выполнено
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/crm/tasks/new?projectId=${id}&parentId=${task.id}`}
                                className="text-xs text-primary hover:text-primary/80"
                              >
                                + Задача
                              </Link>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                {taskStatusLabels[task.status]}
                              </span>
                            </div>
                          </div>
                          {/* Progress bar */}
                          {totalSubtasks > 0 && (
                            <div className="mt-3">
                              <div className="w-full bg-muted rounded-full h-1.5">
                                <div
                                  className="h-1.5 rounded-full bg-green-500 transition-all"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        {/* Subtasks */}
                        {subtasks.length > 0 && (
                          <div className="divide-y divide-border">
                            {subtasks.map((subtask) => (
                              <div
                                key={subtask.id}
                                className="flex items-center justify-between p-3 pl-12 hover:bg-muted/20"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm ${priorityColors[subtask.priority]}`}>●</span>
                                  <div>
                                    <div className={`text-sm ${subtask.status === "DONE" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                      {subtask.title}
                                    </div>
                                    {subtask.assignee && (
                                      <div className="text-xs text-muted-foreground">
                                        {subtask.assignee.name || subtask.assignee.email}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                  {taskStatusLabels[subtask.status]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  } else {
                    // Обычная задача (без подзадач)
                    return (
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
                    );
                  }
                })}
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
              <button
                onClick={() => setShowPaymentForm(true)}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Добавить
              </button>
            </div>

            {/* Payment form */}
            {showPaymentForm && (
              <form onSubmit={handleAddPayment} className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Сумма *</label>
                    <input
                      type="number"
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Дата *</label>
                    <input
                      type="date"
                      value={paymentForm.date}
                      onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Тип</label>
                    <select
                      value={paymentForm.type}
                      onChange={(e) => setPaymentForm({ ...paymentForm, type: e.target.value as "ADVANCE" | "MILESTONE" | "FINAL" })}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="ADVANCE">Аванс</option>
                      <option value="MILESTONE">Этап</option>
                      <option value="FINAL">Финал</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Статус</label>
                    <select
                      value={paymentForm.status}
                      onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as "PENDING" | "RECEIVED" | "CANCELLED" })}
                      className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="PENDING">Ожидается</option>
                      <option value="RECEIVED">Получена</option>
                      <option value="CANCELLED">Отменена</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">№ документа</label>
                  <input
                    type="text"
                    value={paymentForm.documentNumber}
                    onChange={(e) => setPaymentForm({ ...paymentForm, documentNumber: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Номер счета/платежки"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={paymentSaving}
                    className="flex-1 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                  >
                    {paymentSaving ? "..." : "Добавить"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(false)}
                    className="px-3 py-1.5 text-sm bg-muted text-foreground rounded hover:bg-muted/80"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}

            {project.payments.length === 0 && !showPaymentForm ? (
              <p className="text-muted-foreground text-sm">Нет оплат</p>
            ) : (
              <div className="space-y-2">
                {project.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/30 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium">{formatMoney(payment.amount)}</span>
                        <span className="text-xs text-muted-foreground">
                          {paymentTypeLabels[payment.type]}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(payment.date).toLocaleDateString("ru-RU")}
                        {payment.documentNumber && ` • ${payment.documentNumber}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={payment.status}
                        onChange={(e) => handleUpdatePaymentStatus(payment.id, e.target.value as "PENDING" | "RECEIVED" | "CANCELLED")}
                        className={`px-2 py-0.5 rounded text-xs border-0 cursor-pointer ${
                          payment.status === "RECEIVED"
                            ? "bg-green-500/10 text-green-500"
                            : payment.status === "PENDING"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        <option value="PENDING">Ожидается</option>
                        <option value="RECEIVED">Получена</option>
                        <option value="CANCELLED">Отменена</option>
                      </select>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"
                        title="Удалить"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Budget summary */}
            {budgetNum > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Оплачено / Бюджет</span>
                  <span className="text-foreground">
                    {formatMoney(project.totalPaid)} / {formatMoney(project.budget)}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${paidPercent >= 100 ? "bg-green-500" : "bg-primary"}`}
                    style={{ width: `${Math.min(paidPercent, 100)}%` }}
                  />
                </div>
                {budgetNum > project.totalPaid && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Остаток: {formatMoney(budgetNum - project.totalPaid)}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
