"use client";

type TaskStatus = "TODO" | "IN_PROGRESS" | "REVIEW" | "DONE";

interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<TaskStatus, { label: string; bgColor: string; textColor: string }> = {
  TODO: { label: "К выполнению", bgColor: "bg-gray-500/10", textColor: "text-gray-500" },
  IN_PROGRESS: { label: "В работе", bgColor: "bg-blue-500/10", textColor: "text-blue-500" },
  REVIEW: { label: "На проверке", bgColor: "bg-yellow-500/10", textColor: "text-yellow-500" },
  DONE: { label: "Выполнено", bgColor: "bg-green-500/10", textColor: "text-green-500" },
};

/**
 * Бейдж статуса задачи
 */
export function TaskStatusBadge({ status, size = "md" }: TaskStatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-xs"
    : "px-2 py-1 text-xs";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded font-medium ${config.bgColor} ${config.textColor}`}>
      {config.label}
    </span>
  );
}

export function getTaskStatusLabel(status: TaskStatus): string {
  return statusConfig[status].label;
}

export function getTaskStatusColors(status: TaskStatus) {
  return statusConfig[status];
}
