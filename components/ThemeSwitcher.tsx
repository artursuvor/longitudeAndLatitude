"use client";

import { Moon, Sun } from "lucide-react";

export type Theme = "light" | "dark";

type ThemeSwitcherProps = {
  className?: string;
  label: string;
  darkLabel: string;
  lightLabel: string;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
};

export function ThemeSwitcher({
  className = "",
  label,
  darkLabel,
  lightLabel,
  theme,
  onThemeChange,
}: ThemeSwitcherProps) {
  const isDark = theme === "dark";

  return (
    <button
      aria-label={label}
      className={`inline-flex min-h-9 items-center gap-2 whitespace-nowrap rounded-md border border-stone-300 bg-white px-3 py-1.5 text-sm font-bold text-stone-800 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:bg-stone-800 ${className}`}
      type="button"
      onClick={() => onThemeChange(isDark ? "light" : "dark")}
    >
      {isDark ? (
        <Sun className="size-4" aria-hidden="true" />
      ) : (
        <Moon className="size-4" aria-hidden="true" />
      )}
      {isDark ? lightLabel : darkLabel}
    </button>
  );
}
