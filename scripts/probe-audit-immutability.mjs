import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const value = line.trim();
  if (!value || value.startsWith("#")) continue;
  const index = value.indexOf("=");
  if (index < 0) continue;
  env[value.slice(0, index).trim()] = value.slice(index + 1).trim().replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const id = "00000000-0000-0000-0000-000000000000";
const results = {
  insert: (await client.from("admin_audit_log").insert({ id, action: "probe" })).error,
  update: (await client.from("admin_audit_log").update({ action: "probe" }).eq("id", id)).error,
  delete: (await client.from("admin_audit_log").delete().eq("id", id)).error,
};
console.log(JSON.stringify(Object.fromEntries(Object.entries(results).map(([operation, error]) => [operation, {
  denied: Boolean(error),
  code: error?.code ?? null,
  message: error?.message ?? null,
}]))));
