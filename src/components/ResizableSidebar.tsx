"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { Sidebar } from "./Sidebar";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = "sidebar-width";

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

export function ResizableSidebar() {
  const storedWidth = useStoredWidth();
  const [width, setWidth] = useState(storedWidth);
  const [isResizing, setIsResizing] = useState(false);

  // Sync with stored width on mount
  useEffect(() => {
    setWidth(storedWidth);
  }, [storedWidth]);

  // Save width to localStorage when resizing ends
  useEffect(() => {
    if (!isResizing && width !== DEFAULT_WIDTH) {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [isResizing, width]);

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

  return (
    <div className="relative flex" style={{ width }}>
      <div className="flex-1 overflow-hidden">
        <Sidebar />
      </div>
      {/* Resizer handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-10 ${
          isResizing ? "bg-primary" : "bg-transparent"
        }`}
        title="Потяните для изменения ширины"
      />
    </div>
  );
}
