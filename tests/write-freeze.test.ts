import { afterEach, describe, expect, it } from 'vitest';
import { NextRequest } from 'next/server';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { config, proxy } from '@/proxy';
import { SITE } from '@/lib/site-config';
import {
  PHASE12_WRITE_FREEZE_CODE,
  isFrozenApplicationRequest,
  isFrozenSupabaseRequest,
  isPhase12WriteFreezeEnabled,
} from '@/lib/write-freeze';

const originalFreeze = process.env.NEXT_PUBLIC_PHASE12_WRITE_FREEZE;

afterEach(() => {
  if (originalFreeze === undefined) {
    delete process.env.NEXT_PUBLIC_PHASE12_WRITE_FREEZE;
  } else {
    process.env.NEXT_PUBLIC_PHASE12_WRITE_FREEZE = originalFreeze;
  }
});

describe('Phase 12 technical write freeze', () => {
  it('uses an explicit positive enable flag', () => {
    expect(isPhase12WriteFreezeEnabled('1')).toBe(true);
    expect(isPhase12WriteFreezeEnabled('true')).toBe(true);
    expect(isPhase12WriteFreezeEnabled('on')).toBe(true);
    expect(isPhase12WriteFreezeEnabled('0')).toBe(false);
    expect(isPhase12WriteFreezeEnabled(undefined)).toBe(false);
  });

  it.each([
    ['POST', '/api/leads', false],
    ['PATCH', '/api/properties/id/status', false],
    ['POST', '/api/media/upload', false],
    ['POST', '/api/surveys/requests', false],
    ['DELETE', '/api/admin/logs', false],
    ['GET', '/api/followups/process-overdue', false],
    ['GET', '/api/surveys/reminders', false],
    ['POST', '/crm/leads/id', true],
    ['POST', '/invoices', true],
  ])('blocks frozen application request %s %s', (method, pathname, isServerAction) => {
    expect(isFrozenApplicationRequest({ method, pathname, isServerAction, freezeEnabled: true })).toBe(true);
  });

  it('keeps safe reads and non-action page POSTs available', () => {
    expect(isFrozenApplicationRequest({ method: 'GET', pathname: '/api/leads', freezeEnabled: true })).toBe(false);
    expect(isFrozenApplicationRequest({ method: 'GET', pathname: '/crm/leads', freezeEnabled: true })).toBe(false);
    expect(isFrozenApplicationRequest({ method: 'POST', pathname: '/crm/leads', freezeEnabled: true })).toBe(false);
  });

  it.each([
    ['POST', 'https://project.supabase.co/rest/v1/crm_leads'],
    ['PATCH', 'https://project.supabase.co/rest/v1/properties?id=eq.1'],
    ['DELETE', 'https://project.supabase.co/rest/v1/invoices?id=eq.1'],
    ['DELETE', 'https://project.supabase.co/rest/v1/invoice_items?invoice_id=eq.1'],
    ['POST', 'https://project.supabase.co/rest/v1/survey_requests'],
    ['POST', 'https://project.supabase.co/rest/v1/rpc/claim_crm_lead_atomic'],
    ['POST', 'https://project.supabase.co/rest/v1/rpc/process_deal_closing_atomic'],
  ])('blocks direct Supabase mutation %s %s', (method, url) => {
    expect(isFrozenSupabaseRequest({ method, url, freezeEnabled: true })).toBe(true);
  });

  it('does not block Supabase reads or read-only RPCs', () => {
    expect(isFrozenSupabaseRequest({
      method: 'GET',
      url: 'https://project.supabase.co/rest/v1/crm_leads',
      freezeEnabled: true,
    })).toBe(false);
    expect(isFrozenSupabaseRequest({
      method: 'POST',
      url: 'https://project.supabase.co/rest/v1/rpc/list_claimable_crm_leads',
      freezeEnabled: true,
    })).toBe(false);
  });

  it('matches every application ingress covered by the freeze', () => {
    for (const url of [
      '/crm/leads/1',
      '/invoices',
      '/properties/1',
      '/api/leads',
      '/api/followups/process-overdue',
      '/api/media/upload',
      '/api/properties/1/status',
      '/api/surveys/reminders',
      '/api/admin/users/1',
    ]) {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    }
  });

  it('returns an explicit no-store 503 before a frozen public write reaches its route', async () => {
    process.env.NEXT_PUBLIC_PHASE12_WRITE_FREEZE = '1';
    const response = await proxy(new NextRequest(new URL('/api/leads', SITE.url), { method: 'POST' }));

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-plms-write-freeze')).toBe('phase12');
    await expect(response.json()).resolves.toMatchObject({ code: PHASE12_WRITE_FREEZE_CODE });
  });
});
