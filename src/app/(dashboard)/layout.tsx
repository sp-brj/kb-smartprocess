import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ResizableSidebar } from "@/components/ResizableSidebar";
import { SignOutButton } from "@/components/SignOutButton";
import { SearchBox } from "@/components/SearchBox";
import Link from "next/link";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <div className="min-h-screen bg-background flex">
      <ResizableSidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center gap-4">
          <Link href="/" className="text-xl font-semibold text-foreground shrink-0">
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
            {session?.user?.role === "ADMIN" && (
              <Link
                href="/admin/users"
                className="text-sm text-muted-foreground hover:text-foreground"
                data-testid="admin-link"
              >
                Пользователи
              </Link>
            )}
            <span className="text-sm text-muted-foreground" data-testid="user-email">{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
