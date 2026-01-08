"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { TagCloud } from "./TagCloud";

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
  const [creatingInFolderId, setCreatingInFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  const router = useRouter();

  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function fetchFolders() {
      const res = await fetch("/api/folders");
      if (res.ok && !cancelled) {
        const data = await res.json();
        setFolders(data);
      }
    }
    fetchFolders();
    return () => { cancelled = true; };
  }, [reloadCount]);

  function reloadFolders() {
    setReloadCount(c => c + 1);
  }

  async function createFolder(e: React.FormEvent, parentId: string | null = null) {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const res = await fetch("/api/folders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newFolderName, parentId }),
    });

    if (res.ok) {
      setNewFolderName("");
      setIsCreating(false);
      setCreatingInFolderId(null);
      reloadFolders();
    }
  }

  function toggleFolder(folderId: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }

  function startCreatingSubfolder(folderId: string) {
    setCreatingInFolderId(folderId);
    setExpandedFolders(prev => new Set(prev).add(folderId));
  }

  async function handleDrop(e: React.DragEvent, folderId: string | null) {
    e.preventDefault();
    e.stopPropagation();

    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.type === "article") {
        const res = await fetch(`/api/articles/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        });

        if (res.ok) {
          // Full page reload to update Server Components data
          window.location.reload();
        }
      }
    } catch (error) {
      console.error("Drop error:", error);
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  // Build tree from flat list
  const rootFolders = folders.filter((f) => !f.parentId);

  // Helper to get all folders in a map for easy lookup
  const folderMap = new Map<string, Folder>();
  folders.forEach(f => folderMap.set(f.id, f));

  // Calculate folder depth
  function getFolderDepth(folder: Folder): number {
    let depth = 0;
    let current: Folder | undefined = folder;
    while (current?.parentId) {
      depth++;
      current = folderMap.get(current.parentId);
    }
    return depth;
  }

  return (
    <aside className="w-64 bg-card border-r border-border h-screen overflow-y-auto flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Папки</h2>
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setCreatingInFolderId(null);
            }}
            className="text-blue-600 hover:text-blue-700 text-sm"
            data-testid="create-folder-btn"
          >
            + Новая
          </button>
        </div>

        {isCreating && !creatingInFolderId && (
          <form onSubmit={(e) => createFolder(e, null)} className="mb-4" data-testid="create-folder-form">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
              data-testid="folder-name-input"
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
          {/* "Все статьи" - also a drop zone to remove from folder */}
          <div
            onDrop={(e) => handleDrop(e, null)}
            onDragOver={handleDragOver}
            className="transition-colors rounded"
            data-testid="all-articles-dropzone"
          >
            <Link
              href="/articles"
              className={`block px-3 py-2 rounded text-sm ${
                pathname === "/articles"
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
              data-testid="all-articles-link"
            >
              Все статьи
            </Link>
          </div>

          {rootFolders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              pathname={pathname}
              depth={0}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              creatingInFolderId={creatingInFolderId}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              createFolder={createFolder}
              setCreatingInFolderId={setCreatingInFolderId}
              startCreatingSubfolder={startCreatingSubfolder}
              getFolderDepth={getFolderDepth}
            />
          ))}
        </nav>
      </div>
      <TagCloud />
      <div className="p-4 border-t border-border">
        <ThemeToggle />
      </div>
    </aside>
  );
}

interface FolderItemProps {
  folder: Folder;
  pathname: string;
  depth: number;
  expandedFolders: Set<string>;
  toggleFolder: (id: string) => void;
  onDrop: (e: React.DragEvent, folderId: string | null) => void;
  onDragOver: (e: React.DragEvent) => void;
  creatingInFolderId: string | null;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  createFolder: (e: React.FormEvent, parentId: string | null) => Promise<void>;
  setCreatingInFolderId: (id: string | null) => void;
  startCreatingSubfolder: (id: string) => void;
  getFolderDepth: (folder: Folder) => number;
}

function FolderItem({
  folder,
  pathname,
  depth,
  expandedFolders,
  toggleFolder,
  onDrop,
  onDragOver,
  creatingInFolderId,
  newFolderName,
  setNewFolderName,
  createFolder,
  setCreatingInFolderId,
  startCreatingSubfolder,
  getFolderDepth,
}: FolderItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const isActive = pathname === `/folders/${folder.slug}`;
  const isExpanded = expandedFolders.has(folder.id);
  const hasChildren = folder.children && folder.children.length > 0;
  const canCreateSubfolder = depth < 2; // Max 3 levels (0, 1, 2)

  function handleLocalDragOver(e: React.DragEvent) {
    onDragOver(e);
    setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleLocalDrop(e: React.DragEvent) {
    setIsDragOver(false);
    onDrop(e, folder.id);
  }

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 12}px` : 0 }} data-testid={`folder-item-${folder.slug}`}>
      <div
        onDrop={handleLocalDrop}
        onDragOver={handleLocalDragOver}
        onDragLeave={handleDragLeave}
        className={`rounded transition-colors ${
          isDragOver ? "bg-blue-100 ring-2 ring-blue-400" : ""
        }`}
        data-testid={`folder-dropzone-${folder.slug}`}
      >
        <div className="flex items-center group">
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="p-1 hover:bg-gray-100 rounded"
              data-testid={`folder-toggle-${folder.slug}`}
            >
              <svg
                className={`w-3 h-3 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <div className="w-5" />
          )}

          <Link
            href={`/folders/${folder.slug}`}
            className={`flex-1 flex items-center justify-between px-2 py-2 rounded text-sm ${
              isActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-50"
            }`}
            data-testid={`folder-link-${folder.slug}`}
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
              <span className="truncate">{folder.name}</span>
            </span>
            {folder._count.articles > 0 && (
              <span className="text-xs text-gray-400">{folder._count.articles}</span>
            )}
          </Link>

          {/* Add subfolder button */}
          {canCreateSubfolder && (
            <button
              onClick={() => startCreatingSubfolder(folder.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-600 transition-opacity"
              title="Добавить подпапку"
              data-testid={`add-subfolder-${folder.slug}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Create subfolder form */}
      {creatingInFolderId === folder.id && (
        <form
          onSubmit={(e) => createFolder(e, folder.id)}
          className="ml-5 mt-1 mb-2"
          data-testid={`subfolder-form-${folder.slug}`}
        >
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Название подпапки"
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            autoFocus
            data-testid={`subfolder-name-input-${folder.slug}`}
          />
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => setCreatingInFolderId(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Отмена
            </button>
          </div>
        </form>
      )}

      {/* Children folders */}
      {isExpanded && hasChildren && (
        <div className="mt-1">
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              pathname={pathname}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              toggleFolder={toggleFolder}
              onDrop={onDrop}
              onDragOver={onDragOver}
              creatingInFolderId={creatingInFolderId}
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              createFolder={createFolder}
              setCreatingInFolderId={setCreatingInFolderId}
              startCreatingSubfolder={startCreatingSubfolder}
              getFolderDepth={getFolderDepth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
