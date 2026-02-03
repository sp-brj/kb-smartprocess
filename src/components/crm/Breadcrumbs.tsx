"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  crm: "CRM",
  clients: "Клиенты",
  projects: "Проекты",
  tasks: "Задачи",
  time: "Время",
  report: "Отчёт",
  new: "Создание",
  edit: "Редактирование",
  kanban: "Канбан",
  settings: "Настройки",
  statuses: "Статусы",
};

interface BreadcrumbsProps {
  items?: { label: string; href?: string }[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  const pathname = usePathname();

  // If custom items provided, use them
  if (items && items.length > 0) {
    return (
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        {items.map((item, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span>/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-foreground">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    );
  }

  // Auto-generate from pathname
  const segments = pathname.split("/").filter(Boolean);

  // Skip if we're at /crm root
  if (segments.length <= 1) return null;

  const breadcrumbs: { label: string; href: string }[] = [];
  let currentPath = "";

  segments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Skip UUIDs in path (they'll be replaced by dynamic names if needed)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);

    if (isUUID) {
      // For UUIDs, we'd need to fetch the name - for now just skip or show generic
      return;
    }

    const label = routeLabels[segment] || segment;
    breadcrumbs.push({ label, href: currentPath });
  });

  if (breadcrumbs.length <= 1) return null;

  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4" data-testid="crm-breadcrumbs">
      {breadcrumbs.map((crumb, index) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {index > 0 && <span className="text-border">/</span>}
          {index === breadcrumbs.length - 1 ? (
            <span className="text-foreground">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
