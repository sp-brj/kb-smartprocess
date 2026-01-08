"use client";

import { createContext, useContext, useEffect, useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Custom storage for theme with event emitter
let themeListeners: Array<() => void> = [];

function emitThemeChange() {
  themeListeners.forEach(listener => listener());
}

function subscribeToTheme(callback: () => void) {
  themeListeners.push(callback);
  // Also listen for storage events from other tabs
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "theme") callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => {
    themeListeners = themeListeners.filter(l => l !== callback);
    window.removeEventListener("storage", handleStorage);
  };
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  return (localStorage.getItem("theme") as Theme) || "system";
}

function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Use useSyncExternalStore to sync with localStorage
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getStoredTheme,
    () => "system" as Theme
  );

  const resolvedTheme = useSyncExternalStore(
    subscribeToTheme,
    () => getResolvedTheme(theme),
    () => "light" as const
  );

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    const isDark = getResolvedTheme(theme) === "dark";

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Listen for system theme changes when theme is "system"
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => emitThemeChange();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem("theme", newTheme);
    emitThemeChange();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
