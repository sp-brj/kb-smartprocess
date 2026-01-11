"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-sm text-muted-foreground hover:text-foreground px-3 py-1 rounded border border-border hover:border-muted-foreground transition-colors"
      data-testid="logout-btn"
    >
      Выйти
    </button>
  );
}
