"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Sidebar } from "./Sidebar";

const MIN_WIDTH = 200;
const MAX_WIDTH = 500;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = "sidebar-width";
const COLLAPSED_KEY = "sidebar-collapsed";

export function ResizableSidebar() {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const initialized = useRef(false);

  // Initialize from localStorage once on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const savedWidth = localStorage.getItem(STORAGE_KEY);
    if (savedWidth) {
      const parsed = parseInt(savedWidth, 10);
      if (parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        setWidth(parsed);
      }
    }

    const savedCollapsed = localStorage.getItem(COLLAPSED_KEY);
    if (savedCollapsed === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    if (!initialized.current) return;
    localStorage.setItem(COLLAPSED_KEY, isCollapsed.toString());
  }, [isCollapsed]);

  // Save width when resizing ends
  useEffect(() => {
    if (!initialized.current) return;
    if (!isResizing) {
      localStorage.setItem(STORAGE_KEY, width.toString());
    }
  }, [isResizing, width]);

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  // Resizing handlers with stable refs to avoid re-adding listeners
  useEffect(() => {
    if (!isResizing) return;

    function handleMouseMove(e: MouseEvent) {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(newWidth);
    }

    function handleMouseUp() {
      setIsResizing(false);
    }

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setIsCollapsed(prev => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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

      {/* Toggle button */}
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

      {/* Resizer handle */}
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
