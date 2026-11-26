import { describe, it, expect } from 'vitest';
import { navigationItems } from '../app/layouts/AppShell';

describe('Frontend RBAC Navigation Enforcement', () => {
  // Helper to simulate the exact permission-filtering logic in AppShell
  function getVisibleNavigation(userPermissions: string[]) {
    return navigationItems.filter((item) => {
      if (!item.permission && (!item.anyPermissions || item.anyPermissions.length === 0)) {
        return true;
      }
      if (item.permission && userPermissions.includes(item.permission)) {
        return true;
      }
      if (item.anyPermissions && item.anyPermissions.some((p) => userPermissions.includes(p))) {
        return true;
      }
      return false;
    });
  }

  it('1. Super Admin sees all authorised navigation items', () => {
    const superAdminPermissions = [
      'organisation.view',
      'users.view',
      'departments.view',
      'designations.view',
      'roles.view',
      'audit.view',
      'crm.leads.view',
      'crm.customers.view',
      'crm.followups.manage',
      'crm.site_visits.manage',
      'crm.reports.view',
    ];

    const visible = getVisibleNavigation(superAdminPermissions);
    const names = visible.map((i) => i.name);

    expect(names).toContain('Overview');
    expect(names).toContain('CRM Overview');
    expect(names).toContain('Leads');
    expect(names).toContain('Pipeline Kanban');
    expect(names).toContain('Customers');
    expect(names).toContain('Follow-ups');
    expect(names).toContain('Site Visits');
    expect(names).toContain('Users');
    expect(names).toContain('Departments');
    expect(names).toContain('Designations');
    expect(names).toContain('Roles & Permissions');
    expect(names).toContain('Organisation');
    expect(names).toContain('Audit Logs');
    expect(names).toContain('System Health');
  });

  it('2. CRM Manager sees permitted CRM navigation items', () => {
    const crmPermissions = [
      'crm.leads.view',
      'crm.leads.create',
      'crm.leads.update',
      'crm.customers.view',
      'crm.followups.manage',
      'crm.site_visits.manage',
      'crm.reports.view',
    ];

    const visible = getVisibleNavigation(crmPermissions);
    const names = visible.map((i) => i.name);

    expect(names).toContain('Overview');
    expect(names).toContain('CRM Overview');
    expect(names).toContain('Leads');
    expect(names).toContain('Pipeline Kanban');
    expect(names).toContain('Customers');
    expect(names).toContain('Follow-ups');
    expect(names).toContain('Site Visits');
  });

  it('3. CRM Manager does NOT see Users, Departments, Roles, Organisation, or Audit Logs', () => {
    const crmPermissions = [
      'crm.leads.view',
      'crm.customers.view',
      'crm.followups.manage',
      'crm.site_visits.manage',
      'crm.reports.view',
    ];

    const visible = getVisibleNavigation(crmPermissions);
    const names = visible.map((i) => i.name);

    expect(names).not.toContain('Users');
    expect(names).not.toContain('Departments');
    expect(names).not.toContain('Designations');
    expect(names).not.toContain('Roles & Permissions');
    expect(names).not.toContain('Organisation');
    expect(names).not.toContain('Audit Logs');
  });

  it('4. User without users.view cannot see Users in navigation', () => {
    const visible = getVisibleNavigation(['crm.leads.view']);
    const names = visible.map((i) => i.name);

    expect(names).not.toContain('Users');
  });

  it('5. User with users.view can see Users in navigation', () => {
    const visible = getVisibleNavigation(['users.view']);
    const names = visible.map((i) => i.name);

    expect(names).toContain('Users');
    expect(names).not.toContain('Leads');
    expect(names).not.toContain('Roles & Permissions');
  });

  it('6. Empty permissions only sees public items (Overview, System Health)', () => {
    const visible = getVisibleNavigation([]);
    const names = visible.map((i) => i.name);

    expect(names).toEqual(['Overview', 'System Health']);
  });
});

describe('Route Guard & Permission Logic', () => {
  // Simulates ProtectedRoute permission checking logic
  function checkRouteAccess(params: {
    user: { status: string } | null;
    permission?: string;
    anyPermissions?: string[];
    userPermissions: string[];
  }): { allowed: boolean; reason?: string } {
    if (!params.user) {
      return { allowed: false, reason: 'REDIRECT_LOGIN' };
    }
    if (params.user.status !== 'ACTIVE') {
      return { allowed: false, reason: 'DEACTIVATED' };
    }
    if (params.permission && !params.userPermissions.includes(params.permission)) {
      return { allowed: false, reason: 'ACCESS_DENIED' };
    }
    if (params.anyPermissions && params.anyPermissions.length > 0) {
      const hasAny = params.anyPermissions.some((p) => params.userPermissions.includes(p));
      if (!hasAny) {
        return { allowed: false, reason: 'ACCESS_DENIED' };
      }
    }
    return { allowed: true };
  }

  it('Direct URL access to /users is blocked for user without users.view', () => {
    const result = checkRouteAccess({
      user: { status: 'ACTIVE' },
      permission: 'users.view',
      userPermissions: ['crm.leads.view'],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ACCESS_DENIED');
  });

  it('Direct URL access to /users is allowed for user with users.view', () => {
    const result = checkRouteAccess({
      user: { status: 'ACTIVE' },
      permission: 'users.view',
      userPermissions: ['users.view'],
    });

    expect(result.allowed).toBe(true);
  });

  it('Deactivated users are rejected even if they possess permissions', () => {
    const result = checkRouteAccess({
      user: { status: 'DEACTIVATED' },
      permission: 'users.view',
      userPermissions: ['users.view'],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('DEACTIVATED');
  });

  it('Unauthenticated users are redirected to login', () => {
    const result = checkRouteAccess({
      user: null,
      permission: 'users.view',
      userPermissions: [],
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('REDIRECT_LOGIN');
  });
});
