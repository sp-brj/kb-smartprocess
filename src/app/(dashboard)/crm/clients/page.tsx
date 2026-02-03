"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Client = {
  id: string;
  name: string;
  inn: string | null;
  status: "ACTIVE" | "ARCHIVED";
  contacts: { name: string; phone: string | null; email: string | null }[];
  _count: { projects: number };
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "ACTIVE" | "ARCHIVED">(
    ""
  );

  useEffect(() => {
    async function fetchClients() {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);

      const res = await fetch(`/api/clients?${params}`);
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
      setLoading(false);
    }

    const debounce = setTimeout(fetchClients, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Клиенты</h2>
        <Link
          href="/crm/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          data-testid="new-client-button"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Новый клиент
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Поиск по названию или ИНН..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            data-testid="clients-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "" | "ACTIVE" | "ARCHIVED")
          }
          className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          data-testid="clients-status-filter"
        >
          <option value="">Все статусы</option>
          <option value="ACTIVE">Активные</option>
          <option value="ARCHIVED">В архиве</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">
            Загрузка...
          </div>
        ) : clients.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {search || statusFilter
              ? "Клиенты не найдены"
              : "Нет клиентов. Создайте первого!"}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Название
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  ИНН
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Контакт
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Проекты
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">
                  Статус
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/crm/clients/${client.id}`}
                      className="font-medium text-foreground hover:text-primary"
                      data-testid={`client-link-${client.id}`}
                    >
                      {client.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {client.inn || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {client.contacts[0] ? (
                      <div>
                        <div className="text-foreground">
                          {client.contacts[0].name}
                        </div>
                        <div className="text-sm">
                          {client.contacts[0].phone || client.contacts[0].email}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {client._count.projects}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        client.status === "ACTIVE"
                          ? "bg-green-500/10 text-green-500"
                          : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {client.status === "ACTIVE" ? "Активный" : "В архиве"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
