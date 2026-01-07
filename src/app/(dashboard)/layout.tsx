import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
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
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center gap-4">
          <Link href="/" className="text-xl font-semibold text-gray-900 shrink-0">
            База знаний
          </Link>
          <div className="flex-1 max-w-md">
            <SearchBox />
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <Link
              href="/articles/new"
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              + Новая статья
            </Link>
            <span className="text-sm text-gray-600">{session?.user?.email}</span>
            <SignOutButton />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
