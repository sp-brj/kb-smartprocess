import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateRequest } from "@/lib/api-auth";

// GET /api/time-entries/report - отчет по времени
export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request);
  if (!auth.authenticated) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const userId = searchParams.get("userId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const groupBy = searchParams.get("groupBy") || "project"; // project, user, workType, date

  const where: Record<string, unknown> = {};

  if (projectId) where.projectId = projectId;
  if (userId) where.userId = userId;

  if (from || to) {
    where.date = {};
    if (from) (where.date as Record<string, Date>).gte = new Date(from);
    if (to) (where.date as Record<string, Date>).lte = new Date(to);
  }

  // Получаем все записи для отчета
  const entries = await prisma.timeEntry.findMany({
    where,
    include: {
      project: {
        select: { id: true, name: true, client: { select: { id: true, name: true } } },
      },
      task: {
        select: { id: true, title: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { date: "desc" },
  });

  // Подсчитываем итоги
  const totalMinutes = entries.reduce((sum, e) => sum + e.duration, 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.duration, 0);

  // Группируем по выбранному параметру
  const grouped: Record<string, { label: string; minutes: number; billableMinutes: number; entries: typeof entries }> = {};

  for (const entry of entries) {
    let key: string;
    let label: string;

    switch (groupBy) {
      case "user":
        key = entry.userId;
        label = entry.user.name || entry.user.email;
        break;
      case "workType":
        key = entry.workType;
        label = workTypeLabels[entry.workType] || entry.workType;
        break;
      case "date":
        key = entry.date.toISOString().split("T")[0];
        label = new Date(entry.date).toLocaleDateString("ru-RU");
        break;
      case "project":
      default:
        key = entry.projectId;
        label = `${entry.project.name} (${entry.project.client.name})`;
        break;
    }

    if (!grouped[key]) {
      grouped[key] = { label, minutes: 0, billableMinutes: 0, entries: [] };
    }
    grouped[key].minutes += entry.duration;
    if (entry.billable) {
      grouped[key].billableMinutes += entry.duration;
    }
    grouped[key].entries.push(entry);
  }

  return NextResponse.json({
    totalMinutes,
    billableMinutes,
    entriesCount: entries.length,
    grouped: Object.values(grouped).sort((a, b) => b.minutes - a.minutes),
  });
}

const workTypeLabels: Record<string, string> = {
  CONSULTATION: "Консультация",
  DEVELOPMENT: "Разработка",
  TRAINING: "Обучение",
  TESTING: "Тестирование",
  DOCUMENTATION: "Документация",
  MEETING: "Совещание",
  OTHER: "Прочее",
};
