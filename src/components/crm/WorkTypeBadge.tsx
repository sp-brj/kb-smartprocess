"use client";

type WorkType = "CONSULTATION" | "DEVELOPMENT" | "TRAINING" | "TESTING" | "DOCUMENTATION" | "MEETING" | "OTHER";

interface WorkTypeBadgeProps {
  workType: WorkType;
  size?: "sm" | "md";
}

const workTypeConfig: Record<WorkType, { label: string; bgColor: string; textColor: string }> = {
  CONSULTATION: { label: "Консультация", bgColor: "bg-purple-500/10", textColor: "text-purple-500" },
  DEVELOPMENT: { label: "Разработка", bgColor: "bg-blue-500/10", textColor: "text-blue-500" },
  TRAINING: { label: "Обучение", bgColor: "bg-green-500/10", textColor: "text-green-500" },
  TESTING: { label: "Тестирование", bgColor: "bg-orange-500/10", textColor: "text-orange-500" },
  DOCUMENTATION: { label: "Документация", bgColor: "bg-cyan-500/10", textColor: "text-cyan-500" },
  MEETING: { label: "Совещание", bgColor: "bg-pink-500/10", textColor: "text-pink-500" },
  OTHER: { label: "Прочее", bgColor: "bg-gray-500/10", textColor: "text-gray-500" },
};

/**
 * Бейдж типа работы для таймлогов
 */
export function WorkTypeBadge({ workType, size = "md" }: WorkTypeBadgeProps) {
  const config = workTypeConfig[workType];
  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-xs"
    : "px-2 py-1 text-xs";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}

export function getWorkTypeLabel(workType: WorkType): string {
  return workTypeConfig[workType].label;
}

export const workTypeLabels: Record<WorkType, string> = {
  CONSULTATION: "Консультация",
  DEVELOPMENT: "Разработка",
  TRAINING: "Обучение",
  TESTING: "Тестирование",
  DOCUMENTATION: "Документация",
  MEETING: "Совещание",
  OTHER: "Прочее",
};
