"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { Sidebar } from "./Sidebar";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = "sidebar-width";
const COLLAPSED_KEY = "sidebar-collapsed";

function getStoredWidth(): number {
  if (typeof window === "undefined") return DEFAULT_WIDTH;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const parsedWidth = parseInt(saved, 10);
    if (parsedWidth >= MIN_WIDTH && parsedWidth <= MAX_WIDTH) {
      return parsedWidth;
    }
  }
  return DEFAULT_WIDTH;
}

function getStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(COLLAPSED_KEY) === "true";
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function useStoredWidth() {
  return useSyncExternalStore(
    subscribe,
    getStoredWidth,
    () => DEFAULT_WIDTH
  );
}

function useStoredCollapsed() {
  return useSyncExternalStore(
    subscribe,
    getStoredCollapsed,
    () => false
  );
}

export function ResizableSidebar() {
  const storedWidth = useStoredWidth();
  const storedCollapsed = useStoredCollapsed();
  const [width, setWidth] = useState(storedWidth);
  const [isCollapsed, setIsCollapsed] = useState(storedCollapsed);
  const [isResizing, setIsResizing] = useState(false);

  // Sync with stored width on mount
  useEffect(() => {
    setWidth(storedWidth);
  }, [storedWidth]);

  // Sync with stored collapsed state on mount
  useEffect(() => {
    setIsCollapsed(storedCollapsed);
  }, [storedCollapsed]);

  // Save width to localStorage when resizing ends
  useEffect(() => {
    if (!isResizing && width !== DEFAULT_WIDTH) {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [isResizing, width]);

  // Save collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, isCollapsed.toString());
  }, [isCollapsed]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    },
    [isResizing]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleCollapsed();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [toggleCollapsed]);

  // Use margin-left transform to slide sidebar - no reflow, GPU accelerated
  return (
    <div
      className="relative flex-shrink-0 h-screen"
      style={{
        width: width,
        marginLeft: isCollapsed ? -width : 0,
      }}
      data-testid="resizable-sidebar"
    >
      <Sidebar />

      {/* Toggle button - always visible */}
      <button
        onClick={toggleCollapsed}
        className="absolute top-3 z-20 p-1.5 rounded-md bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        style={{
          right: isCollapsed ? -40 : 12,
        }}
        title={isCollapsed ? "Развернуть сайдбар (Ctrl+B)" : "Скрыть сайдбар (Ctrl+B)"}
        data-testid={isCollapsed ? "sidebar-expand-btn" : "sidebar-collapse-btn"}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isCollapsed ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          )}
        </svg>
      </button>

      {/* Resizer handle - only when expanded */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 z-10 ${
            isResizing ? "bg-primary" : "bg-transparent"
          }`}
          title="Потяните для изменения ширины"
        />
      )}
    </div>
  );
}
