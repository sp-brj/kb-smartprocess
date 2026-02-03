"use client";

import Link from "next/link";
import { SearchBox } from "./SearchBox";
import { UserMenu } from "./UserMenu";

export function Header() {
  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center gap-4">
      <Link href="/" className="text-xl font-semibold text-foreground shrink-0">
        База знаний
      </Link>
      <div className="flex-1 max-w-md">
        <SearchBox />
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <Link
          href="/crm"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
          data-testid="crm-link"
        >
          CRM
        </Link>
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
