"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchBox } from "./SearchBox";
import { UserMenu } from "./UserMenu";

export function Header() {
  const pathname = usePathname();
  const isCRM = pathname.startsWith("/crm");
  const isTasks = pathname.startsWith("/tasks");

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center gap-4">
      {/* Module switcher */}
      <div className="flex items-center gap-1 shrink-0">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            !isCRM && !isTasks
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid="kb-link"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            База знаний
          </span>
        </Link>
        <Link
          href="/crm"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isCRM
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid="crm-link"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            CRM
          </span>
        </Link>
        <Link
          href="/tasks"
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isTasks
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
          data-testid="tasks-link"
        >
          <span className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            Задачи
          </span>
        </Link>
      </div>

      {/* Search - only in KB mode */}
      {!isCRM && !isTasks && (
        <div className="flex-1 max-w-md">
          <SearchBox />
        </div>
      )}

      {/* Spacer when not in KB mode */}
      {(isCRM || isTasks) && <div className="flex-1" />}

      {/* Actions */}
      <div className="flex items-center gap-4 shrink-0">
        {!isCRM && !isTasks && (
          <Link
            href="/articles/new"
            className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-accent"
            data-testid="new-article-btn"
          >
            + Новая статья
          </Link>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
