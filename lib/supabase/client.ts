import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

// 1. Export berupa fungsi createClient() (Sesuai standar Next.js Supabase SSR)
export function createClient() {
  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
}

// 2. Export berupa objek singleton 'supabase' (Untuk kompatibilitas kode lama)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);