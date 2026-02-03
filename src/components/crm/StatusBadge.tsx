"use client";

interface StatusBadgeProps {
  name: string;
  color: string;
  size?: "sm" | "md";
}

/**
 * Бейдж статуса проекта с динамическим цветом
 * Цвет берётся из настроек статуса в БД
 */
export function StatusBadge({ name, color, size = "md" }: StatusBadgeProps) {
  const sizeClasses = size === "sm"
    ? "px-1.5 py-0.5 text-xs"
    : "px-2 py-1 text-xs";

  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <span
      className={`inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium`}
      style={{
        backgroundColor: `${color}20`,
        color: color,
      }}
    >
      <span
        className={`${dotSize} rounded-full`}
        style={{ backgroundColor: color }}
      />
      {name}
    </span>
  );
}
