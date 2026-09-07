import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const k = line.slice(0, idx).trim();
    let v = line.slice(idx + 1).trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
    env[k] = v;
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  console.log('--- INVOICES SCHEMA & DATA ---');
  const { data: invSample, error: invErr } = await supabase.from('invoices').select('*').limit(1);
  if (invErr) console.error('Inv error:', invErr);
  else console.log('Invoice columns:', Object.keys(invSample[0] || {}));

  const { data: allInvoices } = await supabase.from('invoices').select('id, invoice_number, client_id, property_id, total_amount, status, created_at');
  console.log('All Invoices count:', allInvoices ? allInvoices.length : 0);
  console.log('Invoices detail:', allInvoices);

  console.log('\n--- CRM DEALS ---');
  const { data: wonLeads, error: dErr } = await supabase.from('crm_leads').select('id, contact_id, property_id, status, deal_state, budget, deal_verified_at, assigned_to').eq('status', 'won');
  console.log('Won leads:', wonLeads);

  const { data: verifiedLeads } = await supabase.from('crm_leads').select('id, deal_state, status, budget, property_id, assigned_to').eq('deal_state', 'verified');
  console.log('Verified deal leads:', verifiedLeads);

  // Check if there is any commission table or deals table
  const { data: commTest, error: commErr } = await supabase.from('commission_ledger').select('*').limit(1);
  console.log('Does commission_ledger table exist?', commErr ? `No (${commErr.message})` : 'Yes');

  const { data: dealsTableTest, error: dtErr } = await supabase.from('crm_deals').select('*').limit(1);
  console.log('Does crm_deals table exist?', dtErr ? `No (${dtErr.message})` : 'Yes');

  const { data: rpcTest, error: rpcErr } = await supabase.rpc('exec_sql', { sql: 'SELECT 1;' });
  console.log('RPC exec_sql exists?', rpcErr ? `No (${rpcErr.message})` : 'Yes');
}

inspect();
