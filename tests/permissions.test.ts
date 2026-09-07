import { describe, it, expect } from 'vitest';
import {
  normalizeRole,
  hasPermission,
  canAccessRoute,
  hasMinRole,
  isBlockedStatus,
} from '@/lib/permissions';
import type { UserRole } from '@/types/user.types';

describe('Role & Permission Guards (Phase 11)', () => {
  describe('normalizeRole', () => {
    it('normalizes legacy "superadmin" to canonical "super_admin"', () => {
      expect(normalizeRole('superadmin')).toBe('super_admin');
      expect(normalizeRole('SUPERADMIN')).toBe('super_admin');
    });

    it('preserves valid standard roles', () => {
      const roles: UserRole[] = ['super_admin', 'admin', 'agent', 'commissioner', 'marketing', 'viewer'];
      for (const role of roles) {
        expect(normalizeRole(role)).toBe(role);
      }
    });

    it('falls back unknown or malformed roles to least privileged "viewer"', () => {
      expect(normalizeRole('hacker')).toBe('viewer');
      expect(normalizeRole(null)).toBe('viewer');
      expect(normalizeRole(undefined)).toBe('viewer');
      expect(normalizeRole('')).toBe('viewer');
    });
  });

  describe('Account Status Guard', () => {
    it('detects blocked account statuses (pending, suspended)', () => {
      expect(isBlockedStatus('pending')).toBe(true);
      expect(isBlockedStatus('suspended')).toBe(true);
      expect(isBlockedStatus('active')).toBe(false);
      expect(isBlockedStatus(null)).toBe(false);
    });
  });

  describe('CRM Permissions per Role', () => {
    it('viewer role has NO CRM access permissions', () => {
      expect(hasPermission('viewer', 'manage_own_crm')).toBe(false);
      expect(hasPermission('viewer', 'manage_all_crm')).toBe(false);
      expect(hasPermission('viewer', 'view_all_crm')).toBe(false);
      expect(canAccessRoute('viewer', '/crm')).toBe(false);
      expect(canAccessRoute('viewer', '/crm/leads')).toBe(false);
      expect(canAccessRoute('viewer', '/crm/followups')).toBe(false);
    });

    it('agent role has own CRM management permission but not all CRM', () => {
      expect(hasPermission('agent', 'manage_own_crm')).toBe(true);
      expect(hasPermission('agent', 'manage_all_crm')).toBe(false);
      expect(hasPermission('agent', 'view_all_crm')).toBe(false);
      expect(canAccessRoute('agent', '/crm')).toBe(true);
      expect(canAccessRoute('agent', '/crm/leads')).toBe(true);
    });

    it('commissioner role has view-only CRM access', () => {
      expect(hasPermission('commissioner', 'view_all_crm')).toBe(true);
      expect(hasPermission('commissioner', 'manage_all_crm')).toBe(false);
      expect(hasPermission('commissioner', 'manage_own_crm')).toBe(false);
      expect(canAccessRoute('commissioner', '/crm')).toBe(true);
    });

    it('admin & super_admin have full CRM permissions', () => {
      expect(hasPermission('admin', 'manage_all_crm')).toBe(true);
      expect(canAccessRoute('admin', '/crm')).toBe(true);
      expect(canAccessRoute('super_admin', '/crm')).toBe(true);
      expect(canAccessRoute('super_admin', '/crm/leads')).toBe(true);
    });
  });

  describe('Invoices & Financial Access', () => {
    it('only admin and super_admin can access /invoices', () => {
      expect(canAccessRoute('super_admin', '/invoices')).toBe(true);
      expect(canAccessRoute('admin', '/invoices')).toBe(true);
      expect(canAccessRoute('commissioner', '/invoices')).toBe(false);
      expect(canAccessRoute('agent', '/invoices')).toBe(false);
      expect(canAccessRoute('viewer', '/invoices')).toBe(false);
    });
  });

  describe('Role Hierarchy and Safety Checks', () => {
    it('hasMinRole respects hierarchy levels correctly', () => {
      expect(hasMinRole('super_admin', 'admin')).toBe(true);
      expect(hasMinRole('admin', 'agent')).toBe(true);
      expect(hasMinRole('agent', 'admin')).toBe(false);
      expect(hasMinRole('viewer', 'agent')).toBe(false);
      expect(hasMinRole(null, 'viewer')).toBe(false);
    });

    it('unauthenticated or null roles are rejected on protected routes', () => {
      expect(canAccessRoute(null, '/crm')).toBe(false);
      expect(canAccessRoute(undefined, '/properties')).toBe(false);
      expect(canAccessRoute(null, '/invoices')).toBe(false);
    });
  });
});
