import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path) {
  let raw;
  try { raw = readFileSync(path, 'utf8'); } catch { return; }
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnv(resolve(process.cwd(), '.env.local'));

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function verify() {
  const { data, error } = await admin.from('ai_user_overrides').insert({
    user_identifier: 'test',
    feature: 'test',
  }).select('*').single();
  
  if (error) {
    if (error.code === '23505') { // unique violation means the table exists and structure is somewhat working
       // wait, let's fetch the columns by querying and looking at the response or by forcing a bad insert
    }
  }
  
  const res = await admin.rpc('get_columns', { table_name: 'ai_user_overrides' });
  // Instead of guessing, let's just do a select with limit 1, but if it's empty, we get empty array.
  // We can insert a dummy and delete it.
  
  const dummyId = 'test_verify_001';
  await admin.from('ai_user_overrides').delete().eq('user_identifier', dummyId);
  const { data: d2, error: e2 } = await admin.from('ai_user_overrides').insert({ user_identifier: dummyId, feature: 'test' }).select('*').single();
  if (d2) {
     console.log(Object.keys(d2).join(', '));
     await admin.from('ai_user_overrides').delete().eq('user_identifier', dummyId);
  } else {
     console.log(e2);
  }
}
verify();
