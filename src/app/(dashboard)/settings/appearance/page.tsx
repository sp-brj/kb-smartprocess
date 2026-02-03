"use client";

import { useTheme } from "@/components/ThemeProvider";

type ThemeOption = "light" | "system" | "dark";

interface ThemeCardProps {
  value: ThemeOption;
  label: string;
  description: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: () => void;
}

function ThemeCard({ value, label, description, icon, isSelected, onSelect }: ThemeCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
        isSelected
          ? "border-primary bg-primary/5"
          : "border-border hover:border-muted-foreground/50"
      }`}
      data-testid={`theme-option-${value}`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      {isSelected && (
        <div className="absolute top-3 right-3">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();

  const themeOptions: Array<{
    value: ThemeOption;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      value: "light",
      label: "Светлая",
      description: "Светлый фон с тёмным текстом",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "Тёмная",
      description: "Тёмный фон со светлым текстом",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ),
    },
    {
      value: "system",
      label: "Системная",
      description: "Автоматически подстраивается под настройки ОС",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Внешний вид</h2>
        <p className="text-sm text-muted-foreground">
          Настройте внешний вид приложения под ваши предпочтения
        </p>
      </div>

      <div>
        <h3 className="text-sm font-medium text-foreground mb-4">Тема оформления</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {themeOptions.map((option) => (
            <ThemeCard
              key={option.value}
              value={option.value}
              label={option.label}
              description={option.description}
              icon={option.icon}
              isSelected={theme === option.value}
              onSelect={() => setTheme(option.value)}
            />
          ))}
        </div>
      </div>

      <hr className="border-border" />

      <div className="text-sm text-muted-foreground">
        <p>
          Настройка темы сохраняется локально в браузере и применяется автоматически
          при следующем посещении.
        </p>
      </div>
    </div>
  );
}
