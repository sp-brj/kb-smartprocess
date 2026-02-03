"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ReportGroup = {
  label: string;
  minutes: number;
  billableMinutes: number;
};

type Report = {
  totalMinutes: number;
  billableMinutes: number;
  entriesCount: number;
  grouped: ReportGroup[];
};

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} мин`;
  if (mins === 0) return `${hours} ч`;
  return `${hours} ч ${mins} мин`;
}

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

export default function TimeReportPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    from: getFirstDayOfMonth(),
    to: new Date().toISOString().split("T")[0],
    groupBy: "project",
  });

  useEffect(() => {
    async function fetchReport() {
      setLoading(true);
      const params = new URLSearchParams({
        from: filters.from,
        to: filters.to,
        groupBy: filters.groupBy,
      });

      const res = await fetch(`/api/time-entries/report?${params}`);
      if (res.ok) {
        setReport(await res.json());
      }
      setLoading(false);
    }
    fetchReport();
  }, [filters]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/crm/time"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Журнал времени
          </Link>
          <h2 className="text-xl font-semibold text-foreground">Отчет по времени</h2>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">С даты</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="report-date-from"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">По дату</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ ...filters, to: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              data-testid="report-date-to"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Группировка</label>
            <select
              value={filters.groupBy}
              onChange={(e) => setFilters({ ...filters, groupBy: e.target.value })}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="project">По проектам</option>
              <option value="user">По сотрудникам</option>
              <option value="workType">По типу работ</option>
              <option value="date">По дням</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({
                from: getFirstDayOfMonth(),
                to: new Date().toISOString().split("T")[0],
                groupBy: "project",
              })}
              className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              Сбросить
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {report && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Всего времени</div>
            <div className="text-2xl font-bold text-foreground">{formatDuration(report.totalMinutes)}</div>
            <div className="text-sm text-muted-foreground">{formatHours(report.totalMinutes)} часов</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Оплачиваемое</div>
            <div className="text-2xl font-bold text-green-500">{formatDuration(report.billableMinutes)}</div>
            <div className="text-sm text-muted-foreground">{formatHours(report.billableMinutes)} часов</div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">Записей</div>
            <div className="text-2xl font-bold text-foreground">{report.entriesCount}</div>
          </div>
        </div>
      )}

      {/* Report table */}
      {loading ? (
        <div className="p-8 text-center text-muted-foreground">Загрузка...</div>
      ) : !report || report.grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
          Нет данных за выбранный период
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  {filters.groupBy === "project" && "Проект"}
                  {filters.groupBy === "user" && "Сотрудник"}
                  {filters.groupBy === "workType" && "Тип работы"}
                  {filters.groupBy === "date" && "Дата"}
                </th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Время</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Часы</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Оплачиваемое</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.grouped.map((group, index) => {
                const percent = report.totalMinutes > 0
                  ? ((group.minutes / report.totalMinutes) * 100).toFixed(0)
                  : 0;
                return (
                  <tr key={index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{group.label}</td>
                    <td className="px-4 py-3 text-right text-foreground">{formatDuration(group.minutes)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{formatHours(group.minutes)}</td>
                    <td className="px-4 py-3 text-right text-green-500">{formatHours(group.billableMinutes)}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{percent}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/50 font-medium">
              <tr>
                <td className="px-4 py-3 text-foreground">Итого</td>
                <td className="px-4 py-3 text-right text-foreground">{formatDuration(report.totalMinutes)}</td>
                <td className="px-4 py-3 text-right text-foreground">{formatHours(report.totalMinutes)}</td>
                <td className="px-4 py-3 text-right text-green-500">{formatHours(report.billableMinutes)}</td>
                <td className="px-4 py-3 text-right text-foreground">100%</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
}
