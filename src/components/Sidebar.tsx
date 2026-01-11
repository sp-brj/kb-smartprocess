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

  async function deleteFolder(folderId: string) {
    if (!confirm("Удалить папку? Папка должна быть пустой.")) return;

    const res = await fetch(`/api/folders/${folderId}`, {
      method: "DELETE",
    });

    if (res.ok) {
      reloadFolders();
    } else {
      const data = await res.json();
      alert(data.error || "Ошибка удаления папки");
    }
  }

  // Helper to update folder article counts optimistically
  function updateFolderCounts(
    folderList: Folder[],
    fromFolderId: string | null,
    toFolderId: string | null
  ): Folder[] {
    return folderList.map(folder => {
      let newCount = folder._count.articles;

      // Decrease count if article was in this folder
      if (folder.id === fromFolderId) {
        newCount = Math.max(0, newCount - 1);
      }
      // Increase count if article moved to this folder
      if (folder.id === toFolderId) {
        newCount = newCount + 1;
      }

      return {
        ...folder,
        _count: { articles: newCount },
        children: folder.children ? updateFolderCounts(folder.children, fromFolderId, toFolderId) : [],
      };
    });
  }

  async function handleDrop(e: React.DragEvent, folderId: string | null) {
    e.preventDefault();
    e.stopPropagation();

    console.log("Drop event on folder:", folderId);
    console.log("DataTransfer types:", e.dataTransfer.types);

    try {
      const jsonData = e.dataTransfer.getData("application/json");
      console.log("JSON data:", jsonData);

      if (!jsonData) {
        console.log("No JSON data found");
        return;
      }

      const data = JSON.parse(jsonData);
      console.log("Parsed data:", data);

      if (data.type === "article") {
        console.log("Moving article", data.id, "to folder", folderId);

        // Optimistic update: update folder counts locally
        const previousFolderId = data.previousFolderId;
        setFolders(prevFolders => {
          return updateFolderCounts(prevFolders, previousFolderId, folderId);
        });

        const res = await fetch(`/api/articles/${data.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folderId }),
        });

        console.log("API response status:", res.status);

        if (res.ok) {
          // Soft refresh to update server components without full page reload
          router.refresh();
        } else {
          const error = await res.text();
          console.error("API error:", error);
          // Revert optimistic update on error
          reloadFolders();
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
    <aside className="w-full bg-card border-r border-border h-screen overflow-y-auto flex flex-col">
      <div className="p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Папки</h2>
          <button
            onClick={() => {
              setIsCreating(!isCreating);
              setCreatingInFolderId(null);
            }}
            className="text-primary hover:text-accent text-sm"
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
              className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              autoFocus
              data-testid="folder-name-input"
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-accent"
              >
                Создать
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
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
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted"
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
              onDeleteFolder={deleteFolder}
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
  onDeleteFolder: (folderId: string) => Promise<void>;
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
  onDeleteFolder,
}: FolderItemProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
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

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }

  // Закрыть контекстное меню при клике вне
  useEffect(() => {
    if (!contextMenu) return;
    function handleClick() {
      setContextMenu(null);
    }
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, [contextMenu]);

  return (
    <div style={{ marginLeft: depth > 0 ? `${depth * 12}px` : 0 }} data-testid={`folder-item-${folder.slug}`}>
      <div
        onDrop={handleLocalDrop}
        onDragOver={handleLocalDragOver}
        onDragLeave={handleDragLeave}
        onContextMenu={handleContextMenu}
        className={`rounded transition-colors ${
          isDragOver ? "bg-primary/20 ring-2 ring-primary" : ""
        }`}
        data-testid={`folder-dropzone-${folder.slug}`}
      >
        <div className="flex items-center group">
          {/* Expand/Collapse button */}
          {hasChildren ? (
            <button
              onClick={() => toggleFolder(folder.id)}
              className="p-1 hover:bg-muted rounded"
              data-testid={`folder-toggle-${folder.slug}`}
            >
              <svg
                className={`w-3 h-3 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
              isActive ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
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
              <span className="ml-2 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {folder._count.articles}
              </span>
            )}
          </Link>

          {/* Add subfolder button */}
          {canCreateSubfolder && (
            <button
              onClick={() => startCreatingSubfolder(folder.id)}
              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-primary transition-opacity"
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

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded shadow-lg py-1 min-w-[150px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {canCreateSubfolder && (
            <button
              onClick={() => {
                startCreatingSubfolder(folder.id);
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить подпапку
            </button>
          )}
          <button
            onClick={() => {
              onDeleteFolder(folder.id);
              setContextMenu(null);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-muted text-red-500 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Удалить
          </button>
        </div>
      )}

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
            className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
            data-testid={`subfolder-name-input-${folder.slug}`}
          />
          <div className="flex gap-2 mt-1">
            <button
              type="submit"
              className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-accent"
            >
              Создать
            </button>
            <button
              type="button"
              onClick={() => setCreatingInFolderId(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
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
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}
    </div>
  );
}
