"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Folder {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children: Folder[];
  _count: { articles: number };
}

export function Sidebar() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;

    async function loadFolders() {
      const res = await fetch("/api/folders");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setFolders(data);
      }
    }

    loadFolders();

    return () => {
      cancelled = true;
    };
  }, []);

  async function createFolder(e: React.FormEvent) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName }),
    });

    if (res.ok) {
      setNewFolderName("");
      setIsCreating(false);
      // Reload folders
      const foldersRes = await fetch("/api/folders");
      if (foldersRes.ok) {
        const data = await foldersRes.json();
        setFolders(data);
      }
    }
  }

  // Build tree from flat list
  const rootFolders = folders.filter((f) => !f.parentId);

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Папки</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            + Новая
          </button>
        </div>

        {isCreating && (
          <form onSubmit={createFolder} className="mb-4">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Отмена
              </button>
            </div>
          </form>
        )}

        <nav className="space-y-1">
          <Link
            href="/articles"
            className={`block px-3 py-2 rounded text-sm ${
              pathname === "/articles"
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Все статьи
          </Link>

          {rootFolders.map((folder) => (
            <FolderItem key={folder.id} folder={folder} pathname={pathname} />
          ))}
        </nav>
      </div>
    </aside>
  );
}

function FolderItem({ folder, pathname }: { folder: Folder; pathname: string }) {
  const isActive = pathname === `/folders/${folder.slug}`;

  return (
    <Link
      href={`/folders/${folder.slug}`}
      className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
        isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
      }`}
    >
      <span className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
          />
        </svg>
        {folder.name}
      </span>
      {folder._count.articles > 0 && (
        <span className="text-xs text-gray-400">{folder._count.articles}</span>
      )}
    </Link>
  );
}
