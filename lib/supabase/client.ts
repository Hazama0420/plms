// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

// Storage cadangan di RAM jika localStorage dilarang oleh browser/iframe
const memoryStore = new Map<string, string>();

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {
      // Abaikan jika localStorage diblokir browser
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch {
      // Abaikan jika localStorage diblokir browser
    }
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
    } catch {
      // Abaikan jika localStorage diblokir browser
    }
    memoryStore.delete(key);
  },
};

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storage: safeStorage, // 💡 Menagkap error storage agar tidak crash/melempar error di konsol
        persistSession: true,
        detectSessionInUrl: true,
      },
    }
  );

export const supabase = createClient();