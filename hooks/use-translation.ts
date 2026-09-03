import { useI18nStore } from "@/lib/store/i18n-store";
import { id } from "@/lib/i18n/id";
import { en } from "@/lib/i18n/en";
import { useEffect, useState } from "react";

type Dictionaries = typeof id;
type DictionaryPath<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T]-?: `${Prefix}${K & string}` | DictionaryPath<T[K], `${Prefix}${K & string}.`>;
    }[keyof T]
  : never;

export type TranslationKey = DictionaryPath<Dictionaries>;

const getNestedValue = (obj: any, path: string): string => {
  return path.split(".").reduce((acc, part) => acc && acc[part], obj) || path;
};

export function useTranslation() {
  const { language, setLanguage } = useI18nStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const t = (key: TranslationKey): string => {
    // Prevent hydration mismatch by using default (id) on first render
    const dict = mounted ? (language === "en" ? en : id) : id;
    return getNestedValue(dict, key as string);
  };

  return { t, language: mounted ? language : "id", setLanguage };
}
