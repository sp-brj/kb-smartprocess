"use client";

import { useState, useEffect, useCallback } from "react";

interface ActivityData {
  timeline: Array<{
    date: string;
    created: number;
    updated: number;
    reverted: number;
    total: number;
  }>;
}

interface Props {
  period: string;
  detailed?: boolean;
}

export function ActivityChart({ period, detailed }: Props) {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);

  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/activity?days=${days}`);
      const json = await res.json();
      if (!json.error) {
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 border border-border">
        <div className="animate-pulse h-48 bg-muted rounded"></div>
      </div>
    );
  }

  if (!data) return null;

  // Вычислить максимум для масштабирования
  const maxValue = Math.max(...data.timeline.map((d) => d.total), 1);

  // Суммарная статистика
  const totals = data.timeline.reduce(
    (acc, d) => ({
      created: acc.created + d.created,
      updated: acc.updated + d.updated,
      reverted: acc.reverted + d.reverted,
      total: acc.total + d.total,
    }),
    { created: 0, updated: 0, reverted: 0, total: 0 }
  );

  // Интервал для лейблов
  const labelInterval = days <= 7 ? 1 : days <= 30 ? 5 : 10;

  return (
    <div className="bg-card rounded-lg p-6 border border-border">
      <h3 className="font-semibold text-foreground mb-4">График активности</h3>

      {/* График */}
      <div className="flex items-end gap-[2px] h-48 mb-2">
        {data.timeline.map((day) => {
          const height = (day.total / maxValue) * 100;

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center group relative">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-popover text-popover-foreground text-xs rounded px-2 py-1 shadow-lg whitespace-nowrap">
                  <div className="font-medium">
                    {new Date(day.date).toLocaleDateString("ru")}
                  </div>
                  <div>Всего: {day.total}</div>
                  {detailed && (
                    <>
                      <div className="text-green-500">Создано: {day.created}</div>
                      <div className="text-blue-500">Обновлено: {day.updated}</div>
                      {day.reverted > 0 && (
                        <div className="text-orange-500">Откат: {day.reverted}</div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Bar */}
              {detailed ? (
                // Стек-бар для детального вида
                <div
                  className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                  style={{ height: `${height}%`, minHeight: day.total > 0 ? "4px" : "0" }}
                >
                  {day.created > 0 && (
                    <div
                      className="bg-green-500"
                      style={{ height: `${(day.created / day.total) * 100}%` }}
                    />
                  )}
                  {day.updated > 0 && (
                    <div
                      className="bg-blue-500"
                      style={{ height: `${(day.updated / day.total) * 100}%` }}
                    />
                  )}
                  {day.reverted > 0 && (
                    <div
                      className="bg-orange-500"
                      style={{ height: `${(day.reverted / day.total) * 100}%` }}
                    />
                  )}
                </div>
              ) : (
                // Простой бар
                <div
                  className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                  style={{
                    height: `${height}%`,
                    minHeight: day.total > 0 ? "4px" : "0",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Лейблы дат */}
      <div className="flex justify-between text-xs text-muted-foreground px-1">
        {data.timeline
          .filter((_, i) => i % labelInterval === 0 || i === data.timeline.length - 1)
          .map((day) => (
            <span key={day.date}>
              {new Date(day.date).toLocaleDateString("ru", {
                day: "numeric",
                month: "short",
              })}
            </span>
          ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-sm">
        <span className="text-muted-foreground">
          Всего: <span className="text-foreground font-medium">{totals.total}</span>
        </span>
        <span className="text-green-600">
          Создано: <span className="font-medium">{totals.created}</span>
        </span>
        <span className="text-blue-600">
          Обновлено: <span className="font-medium">{totals.updated}</span>
        </span>
        {totals.reverted > 0 && (
          <span className="text-orange-600">
            Откат: <span className="font-medium">{totals.reverted}</span>
          </span>
        )}
      </div>
    </div>
  );
}
