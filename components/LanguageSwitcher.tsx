"use client";

import { Languages } from "lucide-react";
import { languages, type Locale } from "@/lib/i18n";

type LanguageSwitcherProps = {
  className?: string;
  label: string;
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
};

export function LanguageSwitcher({
  className = "",
  label,
  locale,
  onLocaleChange,
}: LanguageSwitcherProps) {
  return (
    <label
      className={`flex items-center gap-2 text-sm font-medium text-stone-700 dark:text-stone-300 ${className}`}
    >
      <Languages className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        className="min-h-9 min-w-0 flex-1 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        value={locale}
        onChange={(event) => onLocaleChange(event.target.value as Locale)}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code}>
            {language.nativeLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
