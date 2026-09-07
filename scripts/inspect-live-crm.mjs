import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const index = trimmed.indexOf("=");
  if (index < 0) continue;
  env[trimmed.slice(0, index).trim()] = trimmed
    .slice(index + 1)
    .trim()
    .replace(/^["']|["']$/g, "");
}

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const table of [
  "crm_leads",
  "crm_contacts",
  "crm_interests",
  "crm_followups",
  "crm_activities",
  "admin_audit_log",
]) {
  const { data, error } = await client.from(table).select("*").limit(1);
  console.log(JSON.stringify({
    table,
    ok: !error,
    error: error ? { code: error.code, message: error.message } : null,
    columns: data?.[0] ? Object.keys(data[0]) : [],
  }));
}

for (const [table, column] of [["crm_leads", "status"], ["crm_followups", "status"]]) {
  const { data, error } = await client.from(table).select(column);
  const values = [...new Set((data ?? []).map((row) => row[column]))].sort();
  console.log(JSON.stringify({ table, column, values, error: error?.message ?? null }));
}

const { data: auditRows, error: auditError } = await client
  .from("admin_audit_log")
  .select("action")
  .limit(1000);
console.log(JSON.stringify({
  table: "admin_audit_log",
  actionValues: [...new Set((auditRows ?? []).map((row) => row.action))].sort(),
  error: auditError?.message ?? null,
}));
