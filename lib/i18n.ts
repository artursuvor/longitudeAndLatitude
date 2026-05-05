import cs from "@/messages/cs.json";
import de from "@/messages/de.json";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";

export const dictionaries = {
  en,
  de,
  ru,
  cs,
} as const;

export type Locale = keyof typeof dictionaries;
export type Dictionary = (typeof dictionaries)[Locale];

export const languages: { code: Locale; label: string; nativeLabel: string }[] =
  [
    { code: "en", label: "English", nativeLabel: "English" },
    { code: "de", label: "German", nativeLabel: "Deutsch" },
    { code: "ru", label: "Russian", nativeLabel: "Русский" },
    { code: "cs", label: "Czech", nativeLabel: "Čeština" },
  ];

export function getDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries.en;
}

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "de" || value === "ru" || value === "cs";
}
