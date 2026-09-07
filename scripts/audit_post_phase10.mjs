import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/(^"|"$)/g, '');
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runComprehensiveAudit() {
  console.log('=== STARTING POST-PHASE 10 AUDIT (READ-ONLY) ===\n');

  // 1. Users & Roles
  const { data: users, error: uErr } = await supabase.from('users').select('id, full_name, email, role, created_at');
  console.log('--- 1. USERS & ROLES ---');
  if (uErr) console.error(uErr);
  const roleCounts = {};
  users?.forEach(u => {
    const r = u.role || 'none';
    roleCounts[r] = (roleCounts[r] || 0) + 1;
  });
  console.log('Total Users:', users?.length);
  console.log('Role breakdown:', roleCounts);
  const activeUserMap = new Map(users?.map(u => [u.id, u]));

  // 2. Properties Audit
  console.log('\n--- 2. PROPERTIES AUDIT ---');
  const { data: properties, error: pErr } = await supabase
    .from('properties')
    .select(`
      id, title, listing_code, listing_type, property_type, status, assigned_to, created_by, created_at,
      property_address ( id, address, city_name, province_name ),
      property_media ( id, file_name, is_primary ),
      property_building ( id, building_area ),
      property_land ( id, land_area ),
      property_price ( selling_price, rental_price ),
      property_specifications ( id, bedroom, bathroom, certificate )
    `);
  if (pErr) console.error(pErr);
  console.log('Total Properties:', properties?.length);
  const propStatusCounts = {};
  let propMissingAddress = 0;
  let propMissingMedia = 0;
  let propMissingBuilding = 0;
  let propMissingLand = 0;
  let propMissingPrice = 0;
  let propMissingSpecs = 0;
  let propUnassigned = 0;
  let propInvalidAgent = 0;
  let propPublishedMinimal = 0;

  properties?.forEach(p => {
    propStatusCounts[p.status] = (propStatusCounts[p.status] || 0) + 1;
    const hasAddress = p.property_address && (Array.isArray(p.property_address) ? p.property_address.length > 0 && !!p.property_address[0]?.address : !!p.property_address?.address);
    const hasMedia = p.property_media && (Array.isArray(p.property_media) ? p.property_media.length > 0 : !!p.property_media?.id);
    const hasBuilding = p.property_building && (Array.isArray(p.property_building) ? p.property_building.length > 0 && (p.property_building[0]?.building_area ?? 0) > 0 : (p.property_building?.building_area ?? 0) > 0);
    const hasLand = p.property_land && (Array.isArray(p.property_land) ? p.property_land.length > 0 && (p.property_land[0]?.land_area ?? 0) > 0 : (p.property_land?.land_area ?? 0) > 0);
    const hasPrice = p.property_price && (Array.isArray(p.property_price) ? p.property_price.length > 0 && ((p.property_price[0]?.selling_price ?? 0) > 0 || (p.property_price[0]?.rental_price ?? 0) > 0) : ((p.property_price?.selling_price ?? 0) > 0 || (p.property_price?.rental_price ?? 0) > 0));
    const hasSpecs = p.property_specifications && (Array.isArray(p.property_specifications) ? p.property_specifications.length > 0 : !!p.property_specifications?.id);

    if (!hasAddress) propMissingAddress++;
    if (!hasMedia) propMissingMedia++;
    if (!hasBuilding) propMissingBuilding++;
    if (!hasLand) propMissingLand++;
    if (!hasPrice) propMissingPrice++;
    if (!hasSpecs) propMissingSpecs++;
    if (!p.assigned_to) propUnassigned++;
    else if (!activeUserMap.has(p.assigned_to)) propInvalidAgent++;
    if (p.status === 'published' && (!hasAddress || !hasMedia)) propPublishedMinimal++;
  });

  console.log('Status breakdown:', propStatusCounts);
  console.log('Missing Address:', propMissingAddress);
  console.log('Missing Media:', propMissingMedia);
  console.log('Missing Building specs (area <= 0 or null):', propMissingBuilding);
  console.log('Missing Land specs (area <= 0 or null):', propMissingLand);
  console.log('Missing Price:', propMissingPrice);
  console.log('Missing Specifications row:', propMissingSpecs);
  console.log('Unassigned Properties:', propUnassigned);
  console.log('Invalid Agent:', propInvalidAgent);
  console.log('Published with Minimal data (no address or media):', propPublishedMinimal);

  // 3. CRM Leads & Contacts
  console.log('\n--- 3. CRM LEADS & CONTACTS AUDIT ---');
  const { data: contacts, error: cErr } = await supabase.from('crm_contacts').select('id, full_name, phone, email');
  console.log('Total Contacts:', contacts?.length);

  const { data: leads, error: lErr } = await supabase
    .from('crm_leads')
    .select(`
      id, contact_id, assigned_to, status, deal_state, budget, interest_type, property_id, created_at, updated_at,
      contact:crm_contacts(id, full_name, phone),
      interests:crm_interests(id, property_id),
      activities:crm_activities(id, activity_type, created_at)
    `);
  if (lErr) console.error(lErr);
  console.log('Total Leads:', leads?.length);

  const leadStatusCounts = {};
  let leadsUnassigned = 0;
  let leadsWithoutContact = 0;
  let leadsWithoutProperty = 0;
  let leadsWithoutActivity = 0;
  let leadsStale = 0;
  let totalActivePipelineBudget = 0;
  const now = new Date();

  leads?.forEach(l => {
    leadStatusCounts[l.status] = (leadStatusCounts[l.status] || 0) + 1;
    if (!l.assigned_to) leadsUnassigned++;
    if (!l.contact_id || !l.contact) leadsWithoutContact++;
    const hasProp = l.property_id || (l.interests && l.interests.length > 0);
    if (!hasProp) leadsWithoutProperty++;
    const actCount = l.activities ? (Array.isArray(l.activities) ? l.activities.length : 1) : 0;
    if (actCount === 0) leadsWithoutActivity++;

    const lastUpdate = new Date(l.updated_at || l.created_at);
    const diffDays = (now - lastUpdate) / (1000 * 60 * 60 * 24);
    if (diffDays > 30 && l.status !== 'won' && l.status !== 'lost') leadsStale++;

    if (['new', 'contacted', 'qualified', 'proposal', 'negotiation'].includes(l.status)) {
      totalActivePipelineBudget += Number(l.budget || 0);
    }
  });

  console.log('Lead Status breakdown:', leadStatusCounts);
  console.log('Leads Unassigned:', leadsUnassigned);
  console.log('Leads without Contact:', leadsWithoutContact);
  console.log('Leads without Property interest:', leadsWithoutProperty);
  console.log('Leads without Activity:', leadsWithoutActivity);
  console.log('Stale Active Leads (>30d without update):', leadsStale);
  console.log('Calculated Active Pipeline Budget Sum: Rp', totalActivePipelineBudget.toLocaleString('id-ID'));

  // 4. Follow-ups Audit
  console.log('\n--- 4. FOLLOW-UPS AUDIT ---');
  const { data: followups, error: fErr } = await supabase
    .from('crm_followups')
    .select('id, lead_id, assigned_to, followup_date, status, notes, created_at');
  if (fErr) console.error(fErr);
  console.log('Total Follow-ups:', followups?.length);
  const fuStatusCounts = {};
  let fuOverdue = 0;
  let fuDueToday = 0;
  let fuUpcoming = 0;
  let fuWithoutLead = 0;

  followups?.forEach(f => {
    fuStatusCounts[f.status] = (fuStatusCounts[f.status] || 0) + 1;
    if (!f.lead_id) fuWithoutLead++;
    if (f.status !== 'completed' && f.status !== 'cancelled') {
      const fDate = new Date(f.followup_date);
      if (fDate < now && fDate.toDateString() !== now.toDateString()) fuOverdue++;
      else if (fDate.toDateString() === now.toDateString()) fuDueToday++;
      else if (fDate > now) fuUpcoming++;
    }
  });
  console.log('Follow-up status breakdown:', fuStatusCounts);
  console.log('Follow-ups Overdue:', fuOverdue);
  console.log('Follow-ups Due Today:', fuDueToday);
  console.log('Follow-ups Upcoming:', fuUpcoming);
  console.log('Follow-ups without Lead:', fuWithoutLead);

  // 5. Surveys & Survey Requests Audit
  console.log('\n--- 5. SURVEYS & REQUESTS AUDIT ---');
  const { data: surveys, error: sErr } = await supabase
    .from('surveys')
    .select('id, property_id, lead_id, request_id, client_id, agent_id, scheduled_at, status');
  if (sErr) console.error(sErr);
  console.log('Total Surveys:', surveys?.length);
  let surveysWithoutLead = 0;
  let surveysWithoutProperty = 0;
  surveys?.forEach(s => {
    if (!s.lead_id) surveysWithoutLead++;
    if (!s.property_id) surveysWithoutProperty++;
  });
  console.log('Surveys without Lead:', surveysWithoutLead);
  console.log('Surveys without Property:', surveysWithoutProperty);

  const { data: surveyRequests, error: srErr } = await supabase
    .from('survey_requests')
    .select('id, property_id, requester_id, status, survey_id');
  if (srErr) console.error(srErr);
  console.log('Total Survey Requests:', surveyRequests?.length);
  let orphanRequests = 0;
  let scheduledRequestsWithoutSurvey = 0;
  surveyRequests?.forEach(sr => {
    if (!sr.property_id) orphanRequests++;
    if (sr.status === 'scheduled' && !sr.survey_id) scheduledRequestsWithoutSurvey++;
  });
  console.log('Orphan Survey Requests (no property):', orphanRequests);
  console.log('Scheduled Requests without survey_id:', scheduledRequestsWithoutSurvey);

  // 6. Invoices Audit
  console.log('\n--- 6. INVOICES AUDIT ---');
  const { data: invoices, error: iErr } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_id, client_name, property_id, total_amount, status, created_by, created_at');
  if (iErr) console.error(iErr);
  console.log('Total Invoices:', invoices?.length);
  const invStatusCounts = {};
  let invWithoutClient = 0;
  let invWithoutProperty = 0;
  let totalInvoiceAmount = 0;
  invoices?.forEach(inv => {
    invStatusCounts[inv.status] = (invStatusCounts[inv.status] || 0) + 1;
    if (!inv.client_id && !inv.client_name) invWithoutClient++;
    if (!inv.property_id) invWithoutProperty++;
    totalInvoiceAmount += Number(inv.total_amount || 0);
  });
  console.log('Invoice Status breakdown:', invStatusCounts);
  console.log('Invoices without Client:', invWithoutClient);
  console.log('Invoices without Property:', invWithoutProperty);
  console.log('Total Invoice Amount: Rp', totalInvoiceAmount.toLocaleString('id-ID'));

  // 7. Activities Audit
  console.log('\n--- 7. CRM ACTIVITIES AUDIT ---');
  const { data: activities, error: aErr } = await supabase
    .from('crm_activities')
    .select('id, lead_id, user_id, activity_type, created_at');
  if (aErr) console.error(aErr);
  console.log('Total Activities logged:', activities?.length);
  const actTypeCounts = {};
  activities?.forEach(a => {
    actTypeCounts[a.activity_type] = (actTypeCounts[a.activity_type] || 0) + 1;
  });
  console.log('Activity Types breakdown:', actTypeCounts);

  console.log('\n=== AUDIT DATA EXTRACTION COMPLETED ===');
}

runComprehensiveAudit();
