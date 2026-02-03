"use client";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface PriorityBadgeProps {
  priority: Priority;
  showLabel?: boolean;
  size?: "sm" | "md";
}

const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string }> = {
  LOW: { label: "Низкий", color: "text-gray-500", bgColor: "bg-gray-500/10" },
  MEDIUM: { label: "Средний", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  HIGH: { label: "Высокий", color: "text-orange-500", bgColor: "bg-orange-500/10" },
  URGENT: { label: "Срочный", color: "text-red-500", bgColor: "bg-red-500/10" },
};

/**
 * Бейдж приоритета задачи
 * Может показывать только точку или точку с текстом
 */
export function PriorityBadge({ priority, showLabel = false, size = "md" }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const dotSize = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  if (!showLabel) {
    return (
      <span className={`${dotSize} rounded-full ${config.bgColor}`} title={config.label}>
        <span className={`block ${dotSize} rounded-full ${config.color.replace("text-", "bg-")}`} />
      </span>
    );
  }

  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-xs gap-1"
    : "px-2 py-1 text-xs gap-1.5";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full font-medium ${config.bgColor} ${config.color}`}>
      <span className={`${dotSize} rounded-full bg-current`} />
      {config.label}
    </span>
  );
}

/**
 * Получить цвет приоритета для использования в других компонентах
 */
export function getPriorityColor(priority: Priority): string {
  return priorityConfig[priority].color;
}

export function getPriorityLabel(priority: Priority): string {
  return priorityConfig[priority].label;
}
