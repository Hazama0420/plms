import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Language = "id" | "en";

interface I18nState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      language: "id", // ID is default
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: "inland-language-store",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
