import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function CrmDashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  // Даты для фильтров
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay() + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  // Получаем статистику
  const [
    clientsCount,
    projectsCount,
    projectsByStatus,
    myTasksCount,
    myTasksDone,
    weekTimeEntries,
    pendingPayments,
    upcomingDeadlines,
    recentProjects,
  ] = await Promise.all([
    prisma.client.count({ where: { status: "ACTIVE" } }),
    prisma.project.count(),
    prisma.project.groupBy({
      by: ["statusId"],
      _count: true,
    }),
    userId
      ? prisma.task.count({
          where: { assigneeId: userId, status: { not: "DONE" } },
        })
      : 0,
    userId
      ? prisma.task.count({
          where: {
            assigneeId: userId,
            status: "DONE",
            updatedAt: { gte: weekAgo },
          },
        })
      : 0,
    userId
      ? prisma.timeEntry.aggregate({
          where: {
            userId,
            date: { gte: startOfWeek },
          },
          _sum: { duration: true },
        })
      : { _sum: { duration: null } },
    prisma.payment.findMany({
      where: { status: "PENDING" },
      include: {
        project: { select: { id: true, name: true } },
      },
      orderBy: { date: "asc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: {
        status: { not: "DONE" },
        deadline: { not: null, gte: now },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { name: true, email: true } },
      },
      orderBy: { deadline: "asc" },
      take: 5,
    }),
    prisma.project.findMany({
      include: {
        client: { select: { name: true } },
        status: { select: { name: true, color: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  // Получаем статусы для отображения
  const statuses = await prisma.projectStatus.findMany({
    orderBy: { order: "asc" },
  });

  const weekMinutes = weekTimeEntries._sum?.duration ?? 0;
  const totalPending = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount),
    0
  );

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/crm/clients"
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <svg
                className="w-5 h-5 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{clientsCount}</p>
              <p className="text-xs text-muted-foreground">Клиентов</p>
            </div>
          </div>
        </Link>

        <Link
          href="/crm/projects"
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <svg
                className="w-5 h-5 text-purple-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{projectsCount}</p>
              <p className="text-xs text-muted-foreground">Проектов</p>
            </div>
          </div>
        </Link>

        <Link
          href="/crm/tasks"
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <svg
                className="w-5 h-5 text-orange-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{myTasksCount}</p>
              <p className="text-xs text-muted-foreground">Моих задач</p>
            </div>
          </div>
        </Link>

        <Link
          href="/crm/time"
          className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <svg
                className="w-5 h-5 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {formatDuration(weekMinutes)}
              </p>
              <p className="text-xs text-muted-foreground">За неделю</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects by status */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Проекты по статусам
            </h2>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {statuses.map((status) => {
                const count =
                  projectsByStatus.find((p) => p.statusId === status.id)?._count ?? 0;
                return (
                  <div
                    key={status.id}
                    className="text-center p-3 rounded-lg bg-muted/50"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5"
                      style={{ backgroundColor: status.color }}
                    />
                    <p className="text-xl font-bold text-foreground">{count}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {status.name}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent projects */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">
                Недавние проекты
              </h2>
              <Link
                href="/crm/projects"
                className="text-sm text-primary hover:text-primary/80"
              >
                Все →
              </Link>
            </div>
            <div className="space-y-3">
              {recentProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/crm/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium text-foreground">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.client?.name ?? "Без клиента"}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                    style={{
                      backgroundColor: `${project.status.color}15`,
                      color: project.status.color,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: project.status.color }}
                    />
                    {project.status.name}
                  </span>
                </Link>
              ))}
              {recentProjects.length === 0 && (
                <p className="text-muted-foreground text-sm">Нет проектов</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Pending payments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Ожидаемые оплаты
            </h2>
            {pendingPayments.length > 0 ? (
              <>
                <div className="space-y-3 mb-4">
                  {pendingPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/crm/projects/${payment.project.id}`}
                      className="flex items-center justify-between text-sm hover:bg-muted/30 p-2 rounded -m-2"
                    >
                      <div>
                        <p className="text-foreground">{payment.project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(payment.date).toLocaleDateString("ru-RU")}
                        </p>
                      </div>
                      <span className="font-medium text-foreground">
                        {formatMoney(Number(payment.amount))}
                      </span>
                    </Link>
                  ))}
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Итого:</span>
                    <span className="font-bold text-foreground">
                      {formatMoney(totalPending)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground text-sm">Нет ожидаемых оплат</p>
            )}
          </div>

          {/* Upcoming deadlines */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Ближайшие дедлайны
            </h2>
            {upcomingDeadlines.length > 0 ? (
              <div className="space-y-3">
                {upcomingDeadlines.map((task) => {
                  const daysLeft = Math.ceil(
                    (new Date(task.deadline!).getTime() - now.getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  return (
                    <div
                      key={task.id}
                      className="flex items-start justify-between text-sm"
                    >
                      <div>
                        <p className="text-foreground">{task.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.project.name}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          daysLeft <= 1
                            ? "bg-red-500/10 text-red-500"
                            : daysLeft <= 3
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {daysLeft === 0
                          ? "Сегодня"
                          : daysLeft === 1
                            ? "Завтра"
                            : `${daysLeft} дн`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Нет задач с дедлайном</p>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Моя неделя
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Задач выполнено:</span>
                <span className="font-medium text-green-500">{myTasksDone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Время залогировано:</span>
                <span className="font-medium text-foreground">
                  {formatDuration(weekMinutes)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Быстрые действия
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/crm/clients/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новый клиент
          </Link>
          <Link
            href="/crm/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новый проект
          </Link>
          <Link
            href="/crm/tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Новая задача
          </Link>
          <Link
            href="/crm/time"
            className="inline-flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Записать время
          </Link>
        </div>
      </div>
    </div>
  );
}
