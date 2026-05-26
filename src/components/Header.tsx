"use client";

import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { UserMenu } from "./UserMenu";

export function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center gap-4">
      <Link
        href="/"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-foreground hover:bg-muted transition-colors shrink-0"
        data-testid="kb-link"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        База знаний
      </Link>

      <div className="flex-1 max-w-md">
        <SearchBox />
      </div>

      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/articles/new"
          className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm hover:bg-accent"
          data-testid="new-article-btn"
        >
          + Новая статья
        </Link>
        <UserMenu />
      </div>
    </header>
  );
}
