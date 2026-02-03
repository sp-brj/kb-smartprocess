"use client";

import { signOut } from "next-auth/react";

interface SignOutButtonProps {
  className?: string;
}

export function SignOutButton({ className }: SignOutButtonProps) {
  const defaultStyles = "text-sm text-muted-foreground hover:text-foreground px-3 py-1 rounded border border-border hover:border-muted-foreground transition-colors";

  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className={className || defaultStyles}
      data-testid="logout-btn"
    >
      <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Выйти
    </button>
  );
}
