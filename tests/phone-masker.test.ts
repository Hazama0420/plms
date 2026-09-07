import { describe, it, expect } from 'vitest';
import { maskPhoneNumber } from '@/lib/phone-masker';

describe('Phone Masking Utility (Phase 11)', () => {
  it('returns null for null, undefined, or empty string', () => {
    expect(maskPhoneNumber(null)).toBeNull();
    expect(maskPhoneNumber(undefined)).toBeNull();
    expect(maskPhoneNumber('')).toBeNull();
  });

  it('masks short numbers (<= 6 chars) safely without throwing', () => {
    expect(maskPhoneNumber('123')).toBe('****');
    expect(maskPhoneNumber('123456')).toBe('****');
    expect(maskPhoneNumber('0812')).toBe('****');
  });

  it('masks standard Indonesian phone numbers preserving 4-digit prefix and 4-digit suffix', () => {
    expect(maskPhoneNumber('081234567890')).toBe('0812****7890');
    expect(maskPhoneNumber('085712345678')).toBe('0857****5678');
    expect(maskPhoneNumber('+6281234567890')).toBe('+628****7890');
  });

  it('handles whitespace gracefully by trimming before masking', () => {
    expect(maskPhoneNumber('  081234567890  ')).toBe('0812****7890');
  });

  it('correctly handles boundary length (7 characters)', () => {
    expect(maskPhoneNumber('1234567')).toBe('1234****4567');
  });

  describe('Contextual Phone Visibility Logic', () => {
    function resolveDisplayedPhone(
      phone: string | null,
      actor: { role: string; userId: string },
      lead: { assigned_to: string | null; created_by: string | null }
    ): string {
      const privileged = actor.role === 'admin' || actor.role === 'super_admin';
      const isOwner = lead.assigned_to === actor.userId || lead.created_by === actor.userId;
      const canSeeFull = privileged || isOwner;

      if (canSeeFull) return phone || '-';
      return maskPhoneNumber(phone) || '-';
    }

    const testPhone = '081234567890';

    it('allows Admin and Super Admin to see unmasked phone number', () => {
      const admin = { role: 'admin', userId: 'admin-1' };
      const lead = { assigned_to: 'agent-1', created_by: 'agent-1' };
      expect(resolveDisplayedPhone(testPhone, admin, lead)).toBe('081234567890');
    });

    it('allows Assigned Agent to see unmasked phone number of their own lead', () => {
      const agent = { role: 'agent', userId: 'agent-1' };
      const lead = { assigned_to: 'agent-1', created_by: 'agent-1' };
      expect(resolveDisplayedPhone(testPhone, agent, lead)).toBe('081234567890');
    });

    it('masks phone number for unauthorized agents (not assigned)', () => {
      const otherAgent = { role: 'agent', userId: 'agent-99' };
      const lead = { assigned_to: 'agent-1', created_by: 'agent-1' };
      expect(resolveDisplayedPhone(testPhone, otherAgent, lead)).toBe('0812****7890');
    });

    it('masks phone number for viewers', () => {
      const viewer = { role: 'viewer', userId: 'viewer-1' };
      const lead = { assigned_to: 'agent-1', created_by: 'agent-1' };
      expect(resolveDisplayedPhone(testPhone, viewer, lead)).toBe('0812****7890');
    });
  });
});
