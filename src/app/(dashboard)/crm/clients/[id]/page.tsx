"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Contact = {
  id: string;
  name: string;
  position: string | null;
  phone: string | null;
  email: string | null;
  isPrimary: boolean;
};

type BankAccount = {
  id: string;
  bankName: string;
  bik: string;
  accountNumber: string;
  corrAccount: string | null;
  isPrimary: boolean;
};

type Project = {
  id: string;
  name: string;
  type: string;
  status: { name: string; color: string };
  manager: { name: string | null; email: string };
};

type Client = {
  id: string;
  name: string;
  inn: string | null;
  kpp: string | null;
  ogrn: string | null;
  legalAddress: string | null;
  actualAddress: string | null;
  notes: string | null;
  status: "ACTIVE" | "ARCHIVED";
  contacts: Contact[];
  bankAccounts: BankAccount[];
  projects: Project[];
};

const projectTypeLabels: Record<string, string> = {
  IMPLEMENTATION: "Внедрение",
  CONSULTING: "Консалтинг",
  DEVELOPMENT: "Доработка",
  SUPPORT: "Сопровождение",
};

export default function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchClient() {
      const res = await fetch(`/api/clients/${id}`);
      if (!res.ok) {
        setError("Клиент не найден");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setClient(data);
      setLoading(false);
    }
    fetchClient();
  }, [id]);

  async function handleArchive() {
    if (!confirm("Архивировать клиента?")) return;

    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/crm/clients");
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Загрузка...</div>;
  }

  if (error || !client) {
    return (
      <div className="p-8 text-center text-destructive">
        {error || "Клиент не найден"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/crm/clients"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Все клиенты
          </Link>
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-3">
            {client.name}
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                client.status === "ACTIVE"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-gray-500/10 text-gray-500"
              }`}
            >
              {client.status === "ACTIVE" ? "Активный" : "В архиве"}
            </span>
          </h2>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/crm/clients/${id}/edit`}
            className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors"
            data-testid="edit-client-button"
          >
            Редактировать
          </Link>
          {client.status === "ACTIVE" && (
            <button
              onClick={handleArchive}
              className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
              data-testid="archive-client-button"
            >
              В архив
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Реквизиты */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="font-medium text-foreground mb-4">Реквизиты</h3>
            <dl className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">ИНН</dt>
                <dd className="text-foreground font-medium">{client.inn || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">КПП</dt>
                <dd className="text-foreground font-medium">{client.kpp || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">ОГРН</dt>
                <dd className="text-foreground font-medium">{client.ogrn || "—"}</dd>
              </div>
            </dl>
            {(client.legalAddress || client.actualAddress) && (
              <dl className="mt-4 space-y-2 text-sm">
                {client.legalAddress && (
                  <div>
                    <dt className="text-muted-foreground">Юридический адрес</dt>
                    <dd className="text-foreground">{client.legalAddress}</dd>
                  </div>
                )}
                {client.actualAddress && (
                  <div>
                    <dt className="text-muted-foreground">Фактический адрес</dt>
                    <dd className="text-foreground">{client.actualAddress}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          {/* Контакты */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Контакты</h3>
              <button
                className="text-sm text-primary hover:text-primary/80"
                data-testid="add-contact-button"
              >
                + Добавить
              </button>
            </div>
            {client.contacts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет контактов</p>
            ) : (
              <div className="space-y-3">
                {client.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-start justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {contact.name}
                        {contact.isPrimary && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Основной
                          </span>
                        )}
                      </div>
                      {contact.position && (
                        <div className="text-sm text-muted-foreground">{contact.position}</div>
                      )}
                      <div className="text-sm text-muted-foreground mt-1">
                        {contact.phone && <span className="mr-4">{contact.phone}</span>}
                        {contact.email && <span>{contact.email}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Банковские реквизиты */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Банковские реквизиты</h3>
              <button
                className="text-sm text-primary hover:text-primary/80"
                data-testid="add-bank-account-button"
              >
                + Добавить
              </button>
            </div>
            {client.bankAccounts.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет банковских реквизитов</p>
            ) : (
              <div className="space-y-3">
                {client.bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="font-medium text-foreground flex items-center gap-2">
                      {account.bankName}
                      {account.isPrimary && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          Основной
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1 grid grid-cols-2 gap-2">
                      <div>БИК: {account.bik}</div>
                      <div>Р/с: {account.accountNumber}</div>
                      {account.corrAccount && <div>К/с: {account.corrAccount}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Заметки */}
          {client.notes && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-medium text-foreground mb-4">Заметки</h3>
              <div className="text-sm text-foreground whitespace-pre-wrap">{client.notes}</div>
            </div>
          )}
        </div>

        {/* Sidebar - Projects */}
        <div>
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Проекты</h3>
              <Link
                href={`/crm/projects/new?clientId=${id}`}
                className="text-sm text-primary hover:text-primary/80"
              >
                + Создать
              </Link>
            </div>
            {client.projects.length === 0 ? (
              <p className="text-muted-foreground text-sm">Нет проектов</p>
            ) : (
              <div className="space-y-3">
                {client.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/crm/projects/${project.id}`}
                    className="block p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="font-medium text-foreground">{project.name}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: project.status.color }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {project.status.name}
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">
                        {projectTypeLabels[project.type] || project.type}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
