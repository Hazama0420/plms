import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnv(path) {
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch { return; }
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const anon = createClient(url, anonKey);
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  let allPass = true;
  const fail = (msg) => { console.log(`❌ ${msg}`); allPass = false; };
  const pass = (msg) => console.log(`✅ ${msg}`);

  console.log('--- 1. AI USER OVERRIDES ---');
  // Anon should be denied
  let res = await anon.from('ai_user_overrides').select('*').limit(1);
  if (res.error) pass('anon SELECT denied for ai_user_overrides');
  else fail('anon SELECT allowed for ai_user_overrides');

  // Service role should be allowed
  res = await admin.from('ai_user_overrides').select('*').limit(1);
  if (!res.error) pass('service_role SELECT allowed for ai_user_overrides');
  else fail(`service_role SELECT denied: ${res.error.message}`);

  console.log('\n--- 2. RPC SECURITY & GRANTS ---');
  // Anon execute consume_ai_quota
  let rpcAnon = await anon.rpc('consume_ai_quota', { p_identifier: 'test', p_feature: 'test', p_max_requests: 5, p_max_tokens: 100, p_tokens: 10, p_usage_date: '2026-08-19' });
  if (rpcAnon.error) pass('anon execute consume_ai_quota denied');
  else fail('anon execute consume_ai_quota allowed');

  console.log('\n--- 3. RPC SIGNATURES & LOGIC (CONSUME) ---');
  const probeId = 'probe_user_' + Date.now();
  const dateStr = '2026-08-19';

  // Seed message_count = 4 using the RPC 4 times
  for (let i = 0; i < 4; i++) {
    await admin.rpc('consume_ai_quota', { p_identifier: probeId, p_feature: 'test', p_max_requests: 5, p_max_tokens: 1000, p_tokens: 10, p_usage_date: dateStr });
  }

  // Case A: 5th request
  let rpcAdmin = await admin.rpc('consume_ai_quota', { p_identifier: probeId, p_feature: 'test', p_max_requests: 5, p_max_tokens: 1000, p_tokens: 10, p_usage_date: dateStr });
  if (rpcAdmin.error) {
    fail(`consume_ai_quota error: ${rpcAdmin.error.message}`);
  } else {
    // Expected: granted = true, requests_used = 5
    const row = Array.isArray(rpcAdmin.data) ? rpcAdmin.data[0] : rpcAdmin.data;
    if (row && row.granted === true && row.requests_used === 5) {
      pass(`Case A: 4/5 -> granted=true, message_count=5. (Returned: ${JSON.stringify(row)})`);
    } else {
      fail(`Case A Failed: Expected granted=true, requests_used=5. Got: ${JSON.stringify(row)}`);
    }
  }

  // Case B: 6th request
  rpcAdmin = await admin.rpc('consume_ai_quota', { p_identifier: probeId, p_feature: 'test', p_max_requests: 5, p_max_tokens: 1000, p_tokens: 10, p_usage_date: dateStr });
  if (rpcAdmin.error) {
    fail(`consume_ai_quota error: ${rpcAdmin.error.message}`);
  } else {
    const row = Array.isArray(rpcAdmin.data) ? rpcAdmin.data[0] : rpcAdmin.data;
    if (row && row.granted === false && row.requests_used === 5) {
      pass(`Case B: 5/5 -> granted=false, message_count remains 5. (Returned: ${JSON.stringify(row)})`);
    } else {
      fail(`Case B Failed: Expected granted=false, requests_used=5. Got: ${JSON.stringify(row)}`);
    }
  }

  console.log('\n--- 4. TOKEN ACCOUNTING ---');
  // Check initial tokens
  const initialData = await admin.from('ai_usage').select('token_count').eq('user_identifier', probeId).eq('feature', 'test').single();
  const initialTokens = initialData.data?.token_count ?? -1;
  pass(`Token count before consume: ${initialTokens}`);
  if (initialTokens === 0) {
     pass('consume_ai_quota did not double count tokens (remained 0)');
  } else {
     fail(`consume_ai_quota mutated token_count to ${initialTokens}`);
  }

  // add_ai_tokens
  const addRes = await admin.rpc('add_ai_tokens', { p_identifier: probeId, p_feature: 'test', p_tokens: 150, p_usage_date: dateStr });
  if (addRes.error) {
    fail(`add_ai_tokens error: ${addRes.error.message}`);
  } else {
    pass(`add_ai_tokens returned new token count: ${addRes.data}`);
    if (addRes.data === 150) pass('add_ai_tokens increased token_count by actualTokens');
    else fail('add_ai_tokens returned unexpected amount');
  }

  console.log('\n--- 5. REFUND ---');
  // Refund once
  const ref1 = await admin.rpc('refund_ai_quota', { p_identifier: probeId, p_feature: 'test', p_usage_date: dateStr });
  if (ref1.error) {
    fail(`refund_ai_quota error: ${ref1.error.message}`);
  } else {
    // Check DB
    const afterRef1 = await admin.from('ai_usage').select('message_count').eq('user_identifier', probeId).eq('feature', 'test').single();
    if (afterRef1.data?.message_count === 4) pass('refund_ai_quota decremented exactly by 1 (5 -> 4)');
    else fail(`refund_ai_quota failed: message_count is ${afterRef1.data?.message_count}`);
  }

  // Refund twice
  await admin.rpc('refund_ai_quota', { p_identifier: probeId, p_feature: 'test', p_usage_date: dateStr });
  const afterRef2 = await admin.from('ai_usage').select('message_count').eq('user_identifier', probeId).eq('feature', 'test').single();
  if (afterRef2.data?.message_count === 3) pass('REFUND IDEMPOTENCY GAP verified: second refund decremented to 3');
  else fail(`Unexpected idempotency behavior: message_count is ${afterRef2.data?.message_count}`);

  console.log('\n--- 6. ASIA/JAKARTA DATE ---');
  // Calling with no p_usage_date to check default boundary logic
  const dateProbe = 'date_probe_' + Date.now();
  const rpcProbe = await admin.rpc('consume_ai_quota', { p_identifier: dateProbe, p_feature: 'test_date', p_max_requests: 5, p_max_tokens: 100, p_tokens: 10, p_usage_date: null }); console.log('rpcProbe:', rpcProbe);
  const dateRow = await admin.from('ai_usage').select('usage_date').eq('user_identifier', dateProbe).single();
  console.log(dateRow); if (dateRow.data?.usage_date) pass(`Default usage_date resolved to: ${dateRow.data.usage_date} (DB constraint/default verified)`);
  else fail('Failed to resolve default usage_date');
  
  // Cleanup probes
  await admin.from('ai_usage').delete().like('user_identifier', '%probe_%');

  if (allPass) {
    console.log('\n✅ ALL CUSTOM VERIFICATIONS PASSED');
    process.exit(0);
  } else {
    console.log('\n❌ SOME CUSTOM VERIFICATIONS FAILED');
    process.exit(1);
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
