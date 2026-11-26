import crypto from 'node:crypto';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createApp } from '../app.js';
import { prisma } from '../database/prisma.js';
import { auth } from '../common/auth/better-auth.js';
import {
  PREDEFINED_ROLE_TEMPLATES,
  seedOrganisationRoleTemplates,
  resetRoleToTemplateDefaults,
} from '../common/rbac/permissions-catalog.js';

const app = createApp();

describe('AIW OS — Predefined Organisation Role Templates & Scope Restrictions', () => {
  const runId = crypto.randomBytes(4).toString('hex');

  const orgA = {
    name: `Role Test Org A ${runId}`,
    slug: `role-test-a-${runId}`,
    adminName: 'Super Admin Org A',
    adminEmail: `admin-a-${runId}@roletest.local`,
    adminPassword: 'Password123!',
  };

  const orgB = {
    name: `Role Test Org B ${runId}`,
    slug: `role-test-b-${runId}`,
    adminName: 'Super Admin Org B',
    adminEmail: `admin-b-${runId}@roletest.local`,
    adminPassword: 'Password123!',
  };

  let orgAId: string;
  let orgBId: string;
  let adminACookies: string[] = [];
  let adminBCookies: string[] = [];

  let workerCookies: string[] = [];
  let siteEngineerCookies: string[] = [];
  let procurementCookies: string[] = [];
  let accountsCookies: string[] = [];

  beforeAll(async () => {
    // 1. Create Org A
    const createdOrgA = await prisma.organisation.create({
      data: { name: orgA.name, slug: orgA.slug, status: 'ACTIVE' },
    });
    orgAId = createdOrgA.id;

    // Seed role templates for Org A
    await seedOrganisationRoleTemplates(orgAId);

    const superAdminRoleA = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'ORGANISATION_SUPER_ADMIN' } },
    });

    const signUpA = await auth.api.signUpEmail({
      body: { email: orgA.adminEmail, password: orgA.adminPassword, name: orgA.adminName },
    });
    await prisma.user.update({
      where: { id: signUpA.user.id },
      data: { organisationId: orgAId, status: 'ACTIVE' },
    });
    await prisma.userRole.create({
      data: {
        organisationId: orgAId,
        userId: signUpA.user.id,
        roleId: superAdminRoleA.id,
        assignedByUserId: signUpA.user.id,
      },
    });

    const loginResA = await request(app).post('/api/v1/auth/sign-in/email').send({
      email: orgA.adminEmail,
      password: orgA.adminPassword,
    });
    adminACookies = loginResA.headers['set-cookie'] as unknown as string[];

    // 2. Create Org B (for cross-tenant checks)
    const createdOrgB = await prisma.organisation.create({
      data: { name: orgB.name, slug: orgB.slug, status: 'ACTIVE' },
    });
    orgBId = createdOrgB.id;
    await seedOrganisationRoleTemplates(orgBId);

    const superAdminRoleB = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgBId, code: 'ORGANISATION_SUPER_ADMIN' } },
    });

    const signUpB = await auth.api.signUpEmail({
      body: { email: orgB.adminEmail, password: orgB.adminPassword, name: orgB.adminName },
    });
    await prisma.user.update({
      where: { id: signUpB.user.id },
      data: { organisationId: orgBId, status: 'ACTIVE' },
    });
    await prisma.userRole.create({
      data: {
        organisationId: orgBId,
        userId: signUpB.user.id,
        roleId: superAdminRoleB.id,
        assignedByUserId: signUpB.user.id,
      },
    });

    const loginResB = await request(app).post('/api/v1/auth/sign-in/email').send({
      email: orgB.adminEmail,
      password: orgB.adminPassword,
    });
    adminBCookies = loginResB.headers['set-cookie'] as unknown as string[];

    // 3. Provision specific test users in Org A
    const workerRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'WORKER_CONTRACTOR' } },
    });
    const seRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'SITE_ENGINEER' } },
    });
    const procRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'PROCUREMENT' } },
    });
    const accRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'ACCOUNTS' } },
    });

    // Helper to create and login role user
    const setupUser = async (email: string, roleId: string) => {
      const u = await auth.api.signUpEmail({
        body: { email, password: 'Password123!', name: email },
      });
      await prisma.user.update({
        where: { id: u.user.id },
        data: { organisationId: orgAId, status: 'ACTIVE' },
      });
      await prisma.userRole.create({
        data: {
          organisationId: orgAId,
          userId: u.user.id,
          roleId,
          assignedByUserId: signUpA.user.id,
        },
      });
      const login = await request(app).post('/api/v1/auth/sign-in/email').send({
        email,
        password: 'Password123!',
      });
      return login.headers['set-cookie'] as unknown as string[];
    };

    workerCookies = await setupUser(`worker-${runId}@roletest.local`, workerRole.id);
    siteEngineerCookies = await setupUser(`se-${runId}@roletest.local`, seRole.id);
    procurementCookies = await setupUser(`proc-${runId}@roletest.local`, procRole.id);
    accountsCookies = await setupUser(`acc-${runId}@roletest.local`, accRole.id);
  }, 60000);

  afterAll(async () => {
    try {
      if (orgAId) {
        await prisma.userRole.deleteMany({ where: { organisationId: orgAId } });
        await prisma.rolePermission.deleteMany({ where: { organisationId: orgAId } });
        await prisma.role.deleteMany({ where: { organisationId: orgAId } });
        await prisma.user.deleteMany({ where: { organisationId: orgAId } });
        await prisma.organisation.deleteMany({ where: { id: orgAId } });
      }
      if (orgBId) {
        await prisma.userRole.deleteMany({ where: { organisationId: orgBId } });
        await prisma.rolePermission.deleteMany({ where: { organisationId: orgBId } });
        await prisma.role.deleteMany({ where: { organisationId: orgBId } });
        await prisma.user.deleteMany({ where: { organisationId: orgBId } });
        await prisma.organisation.deleteMany({ where: { id: orgBId } });
      }
    } catch {
      // Ignore cleanup error
    }
    await prisma.$disconnect();
  }, 60000);

  it('1. Verifies all nine predefined templates are created', async () => {
    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Cookie', adminACookies);
    expect(rolesRes.status).toBe(200);

    const roleCodes = rolesRes.body.data.map((r: any) => r.code);
    const expectedNine = [
      'ORGANISATION_SUPER_ADMIN',
      'ADMIN',
      'PROJECT_MANAGER',
      'SITE_ENGINEER',
      'ARCHITECT_INTERIOR_DESIGNER',
      'ACCOUNTS',
      'PROCUREMENT',
      'HR_OFFICE_ADMIN',
      'WORKER_CONTRACTOR',
    ];

    for (const code of expectedNine) {
      expect(roleCodes).toContain(code);
    }
  });

  it('2. Verifies templates are organisation-scoped', async () => {
    const rolesA = await prisma.role.findMany({ where: { organisationId: orgAId } });
    const rolesB = await prisma.role.findMany({ where: { organisationId: orgBId } });

    expect(rolesA.length).toBeGreaterThanOrEqual(9);
    expect(rolesB.length).toBeGreaterThanOrEqual(9);

    // Ensure distinct IDs across organisations
    const aIds = new Set(rolesA.map((r) => r.id));
    for (const r of rolesB) {
      expect(aIds.has(r.id)).toBe(false);
    }
  });

  it('3. Verifies default permissions for each role template', async () => {
    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Cookie', adminACookies);

    const roles = rolesRes.body.data;

    // Check Worker Contractor
    const workerRole = roles.find((r: any) => r.code === 'WORKER_CONTRACTOR');
    const workerPerms = workerRole.rolePermissions.map((rp: any) => rp.permission.code);
    expect(workerPerms).toEqual(
      expect.arrayContaining(['attendance.check_in', 'attendance.check_out', 'attendance.view_own']),
    );
    expect(workerPerms).not.toContain('crm.leads.view');
    expect(workerPerms).not.toContain('users.view');

    // Check Accounts
    const accRole = roles.find((r: any) => r.code === 'ACCOUNTS');
    const accPerms = accRole.rolePermissions.map((rp: any) => rp.permission.code);
    expect(accPerms).toContain('finance.records.view');
    expect(accPerms).toContain('finance.receipts.manage');
    // Financial approval separation: Accounts does not receive payment approve authority by default
    expect(accPerms).not.toContain('finance.payments.approve');

    // Check Super Admin does NOT have restricted high-value approvals
    const saRole = roles.find((r: any) => r.code === 'ORGANISATION_SUPER_ADMIN');
    const saPerms = saRole.rolePermissions.map((rp: any) => rp.permission.code);
    expect(saPerms).not.toContain('procurement.approve_high_value');
    expect(saPerms).not.toContain('quotations.approve');
    expect(saPerms).not.toContain('finance.payments.approve');
  });

  it('4. Custom permission changes persist', async () => {
    const pmRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'PROJECT_MANAGER' } },
    });

    const updateRes = await request(app)
      .put(`/api/v1/roles/${pmRole.id}/permissions`)
      .set('Cookie', adminACookies)
      .send({
        permissionCodes: ['projects.view', 'designs.view'],
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.permissions).toEqual(['projects.view', 'designs.view']);
  });

  it('5. Reseeding does not overwrite customised permissions', async () => {
    // Run seed again
    const seedRes = await request(app)
      .post('/api/v1/roles/seed-templates')
      .set('Cookie', adminACookies);
    expect(seedRes.status).toBe(200);

    const pmRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'PROJECT_MANAGER' } },
      include: { rolePermissions: { include: { permission: true } } },
    });

    const currentPerms = pmRole.rolePermissions.map((rp) => rp.permission.code);
    // Should still have only the customized permissions
    expect(currentPerms).toHaveLength(2);
    expect(currentPerms).toContain('projects.view');
    expect(currentPerms).toContain('designs.view');
  }, 20000);

  it('6. Explicit reset restores defaults', async () => {
    const pmRole = await prisma.role.findUniqueOrThrow({
      where: { organisationId_code: { organisationId: orgAId, code: 'PROJECT_MANAGER' } },
    });

    const resetRes = await request(app)
      .post(`/api/v1/roles/${pmRole.id}/reset-defaults`)
      .set('Cookie', adminACookies);
    expect(resetRes.status).toBe(200);

    const template = PREDEFINED_ROLE_TEMPLATES.find((t) => t.code === 'PROJECT_MANAGER')!;
    expect(resetRes.body.data.permissions.sort()).toEqual(template.defaultPermissions.sort());
  }, 20000);

  it('7. Worker cannot access non-attendance modules (CRM, Users, Audit, Roles)', async () => {
    const leadsRes = await request(app)
      .get('/api/v1/crm/leads')
      .set('Cookie', workerCookies);
    expect(leadsRes.status).toBe(403);

    const usersRes = await request(app)
      .get('/api/v1/users')
      .set('Cookie', workerCookies);
    expect(usersRes.status).toBe(403);

    const auditRes = await request(app)
      .get('/api/v1/audit-logs')
      .set('Cookie', workerCookies);
    expect(auditRes.status).toBe(403);

    const rolesRes = await request(app)
      .get('/api/v1/roles')
      .set('Cookie', workerCookies);
    expect(rolesRes.status).toBe(403);
  });

  it('8. Site Engineer cannot access user or role administration', async () => {
    const usersRes = await request(app)
      .get('/api/v1/users')
      .set('Cookie', siteEngineerCookies);
    expect(usersRes.status).toBe(403);

    const createRoleRes = await request(app)
      .post('/api/v1/roles')
      .set('Cookie', siteEngineerCookies)
      .send({ name: 'Hacked Role', code: 'HACKED' });
    expect(createRoleRes.status).toBe(403);
  });

  it('9. Procurement and Accounts cannot bypass approval separation', async () => {
    const procMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', procurementCookies);
    expect(procMe.status).toBe(200);
    expect(procMe.body.data.permissions).not.toContain('procurement.approve_high_value');

    const accMe = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', accountsCookies);
    expect(accMe.status).toBe(200);
    expect(accMe.body.data.permissions).not.toContain('finance.payments.approve');
  });

  it('10. Super Admin retains organisation administration access', async () => {
    const orgRes = await request(app)
      .get('/api/v1/organisations/current')
      .set('Cookie', adminACookies);
    expect(orgRes.status).toBe(200);
    expect(orgRes.body.data.slug).toBe(orgA.slug);

    const usersRes = await request(app)
      .get('/api/v1/users')
      .set('Cookie', adminACookies);
    expect(usersRes.status).toBe(200);
  }, 20000);

  it('11. Rejects cross-tenant role and permission manipulation', async () => {
    // Org A's Super Admin attempts to update Org B's role
    const roleB = await prisma.role.findFirstOrThrow({
      where: { organisationId: orgBId },
    });

    const crossUpdateRes = await request(app)
      .put(`/api/v1/roles/${roleB.id}/permissions`)
      .set('Cookie', adminACookies)
      .send({ permissionCodes: ['organisation.view'] });
    expect(crossUpdateRes.status).toBe(404);

    // Cross-tenant reset attempt
    const crossResetRes = await request(app)
      .post(`/api/v1/roles/${roleB.id}/reset-defaults`)
      .set('Cookie', adminACookies);
    expect(crossResetRes.status).toBe(404);
  });
});
